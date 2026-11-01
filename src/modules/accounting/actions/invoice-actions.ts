"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions, accountingSetupPermissions } from "../permissions";
import {
  invoiceCancelSchema,
  invoiceIdSchema,
  invoicePaymentSchema,
  invoiceSchema,
  invoiceSettingsSchema,
  invoiceUpdateSchema,
  parseDecimal,
  type InvoiceInput,
} from "../schemas/invoice";
import { calculateInvoiceTotals } from "../services/invoice-calc";
import { allocateInvoiceNumber } from "../services/invoice-number";
import { applyInvoicePayment, INVOICE_SOURCE } from "../services/invoice-payment-service";
import { reverseSourcedBooking } from "../services/sourced-bookings";
import { parseDateOnly } from "../utils";


function dateOrThrow(value: string): Date {
  const date = parseDateOnly(value);
  if (!date) throw new ActionError("accounting.validation.bookingDateInvalid");
  return date;
}

/** Form girdisi → kalıcı alanlar + satırlar + toplamlar (cent). */
function invoiceData(input: InvoiceInput) {
  const lines = input.lines.map((line, index) => {
    const unitPriceCents = toCents(line.unitPrice);
    if (unitPriceCents === null) {
      throw new ActionError("accounting.invoices.validation.price", { [`lines.${index}.unitPrice`]: ["accounting.invoices.validation.price"] });
    }
    return { description: line.description, quantity: parseDecimal(line.quantity), unit: line.unit || null, unitPriceCents, taxRate: Number(line.taxRate) };
  });
  const totals = calculateInvoiceTotals(lines);
  return {
    fields: {
      kind: input.kind,
      issueDate: dateOrThrow(input.issueDate),
      dueDate: input.dueDate ? dateOrThrow(input.dueDate) : null,
      serviceDate: input.serviceDate || null,
      recipientName: input.recipientName,
      recipientAddress: input.recipientAddress || null,
      recipientEmail: input.recipientEmail || null,
      subject: input.subject || null,
      introText: input.introText || null,
      footerText: input.footerText || null,
      taxNote: input.taxNote || null,
      categoryId: input.categoryId || null,
      contactId: input.contactId || null,
      netCents: totals.netCents,
      taxCents: totals.taxCents,
      grossCents: totals.grossCents,
    },
    lines: lines.map((line, index) => ({
      position: index + 1,
      description: line.description,
      quantity: line.quantity.toFixed(2),
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      taxRate: line.taxRate,
      totalCents: totals.lineTotals[index],
    })),
  };
}

async function loadInvoice(id: string, tx: Prisma.TransactionClient = getDb()) {
  const invoice = await tx.accountingInvoice.findUnique({ where: { id } });
  if (!invoice) throw new ActionError("accounting.invoices.errors.notFound");
  return invoice;
}

const refresh = (id?: string) => {
  revalidatePath("/muhasebe/faturalar");
  if (id) revalidatePath(`/muhasebe/faturalar/${id}`);
};

export async function createInvoiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: invoiceSchema,
    handler: async ({ input, user, audit }) => {
      const { fields, lines } = invoiceData(input);
      const created = await getDb().accountingInvoice.create({
        data: { ...fields, createdById: user.id, createdByLabel: buildUserLabel(user.name, user.email), lines: { create: lines } },
      });
      await audit({ action: "CREATE", entity: "AccountingInvoice", entityId: created.id, after: { kind: created.kind, grossCents: created.grossCents } });
      refresh();
      return { id: created.id };
    },
  });
  return run(input);
}

/** Yalnızca taslak düzenlenebilir; kesinleşen fatura değişmez (iptal edilip yenisi kesilir). */
export async function updateInvoiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: invoiceUpdateSchema,
    handler: async ({ input, audit }) => {
      const existing = await loadInvoice(input.id);
      if (existing.status !== "DRAFT") throw new ActionError("accounting.invoices.errors.notDraft");
      const { fields, lines } = invoiceData(input);
      await getDb().$transaction([
        getDb().accountingInvoiceLine.deleteMany({ where: { invoiceId: existing.id } }),
        getDb().accountingInvoice.update({ where: { id: existing.id }, data: { ...fields, lines: { create: lines } } }),
      ]);
      await audit({ action: "UPDATE", entity: "AccountingInvoice", entityId: existing.id, after: { grossCents: fields.grossCents } });
      refresh(existing.id);
      return { id: existing.id };
    },
  });
  return run(input);
}

export async function deleteInvoiceDraftAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: invoiceIdSchema,
    handler: async ({ input, audit }) => {
      const existing = await loadInvoice(input.id);
      if (existing.status !== "DRAFT") throw new ActionError("accounting.invoices.errors.notDraft");
      await getDb().accountingInvoice.delete({ where: { id: existing.id } });
      await audit({ action: "DELETE", entity: "AccountingInvoice", entityId: existing.id, before: { kind: existing.kind } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** Kesinleştirme: numara verilir (yıl + tür başına boşluksuz), belge artık değişmez. */
export async function issueInvoiceAction(input: unknown): Promise<ActionResult<{ number: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: invoiceIdSchema,
    handler: async ({ input, audit }) => {
      const number = await getDb().$transaction(async (tx) => {
        const invoice = await loadInvoice(input.id, tx);
        if (invoice.status !== "DRAFT") throw new ActionError("accounting.invoices.errors.notDraft");
        const year = invoice.issueDate.getUTCFullYear();
        const allocated = await allocateInvoiceNumber(tx, invoice.kind, year);
        await tx.accountingInvoice.update({
          where: { id: invoice.id },
          data: { status: "ISSUED", number: allocated.number, year, sequence: allocated.sequence, issuedAt: new Date() },
        });
        return allocated.number;
      });
      await audit({ action: "INVOICE_ISSUE", entity: "AccountingInvoice", entityId: input.id, after: { number } });
      refresh(input.id);
      return { number };
    },
  });
  return run(input);
}

/** Proformadan fatura taslağı: kalemler kopyalanır, tarih bugün. */
export async function convertProformaAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: invoiceIdSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const proforma = await db.accountingInvoice.findUnique({ where: { id: input.id }, include: { lines: true } });
      if (!proforma) throw new ActionError("accounting.invoices.errors.notFound");
      if ((proforma.kind !== "PROFORMA" && proforma.kind !== "QUOTE") || proforma.status === "DRAFT" || proforma.status === "CANCELLED") {
        throw new ActionError("accounting.invoices.errors.cannotConvert");
      }
      if (await db.accountingInvoice.findFirst({ where: { sourceProformaId: proforma.id, status: { not: "CANCELLED" } } })) {
        throw new ActionError("accounting.invoices.errors.alreadyConverted");
      }
      const today = parseDateOnly(new Date().toISOString().slice(0, 10)) as Date;
      const created = await db.accountingInvoice.create({
        data: {
          kind: "INVOICE",
          issueDate: today,
          dueDate: proforma.dueDate && proforma.dueDate > today ? proforma.dueDate : null,
          serviceDate: proforma.serviceDate,
          recipientName: proforma.recipientName,
          recipientAddress: proforma.recipientAddress,
          recipientEmail: proforma.recipientEmail,
          subject: proforma.subject,
          introText: proforma.introText,
          footerText: proforma.footerText,
          taxNote: proforma.taxNote,
          categoryId: proforma.categoryId,
          contactId: proforma.contactId,
          netCents: proforma.netCents,
          taxCents: proforma.taxCents,
          grossCents: proforma.grossCents,
          sourceProformaId: proforma.id,
          createdById: user.id,
          createdByLabel: buildUserLabel(user.name, user.email),
          lines: {
            create: proforma.lines.map(({ position, description, quantity, unit, unitPriceCents, taxRate, totalCents }) => ({
              position, description, quantity, unit, unitPriceCents, taxRate, totalCents,
            })),
          },
        },
      });
      await audit({ action: "CREATE", entity: "AccountingInvoice", entityId: created.id, after: { from: proforma.number, kind: proforma.kind } });
      refresh(proforma.id);
      return { id: created.id };
    },
  });
  return run(input);
}

/**
 * Tahsilat (ACC-3): kısmi ödeme desteklenir. Tutar fatura brütündeki KDV oran paylarına göre
 * bölünür; oran başına bir gelir fişi yazılır (sourceId: ilk fiş = fatura id, sonrakiler
 * "<id>:<n>"). "Kalanı kapat" ile açık kalan Skonto/kayıp olarak kapanır — gelir ve KDV yalnızca
 * tahsil edilen tutar kadar oluşur. Açık tutar 0 olunca fatura PAID olur.
 */
export async function recordInvoicePaymentAction(input: unknown): Promise<ActionResult<{ bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: invoicePaymentSchema,
    handler: async ({ input, user, audit }) => {
      const paidDate = dateOrThrow(input.paidDate);
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      const result = await getDb().$transaction((tx) =>
        applyInvoicePayment(tx, {
          invoiceId: input.id,
          paidDate,
          accountId: input.accountId,
          categoryId: input.categoryId,
          amountCents: input.amount ? toCents(input.amount) : null,
          closeRemainder: input.closeRemainder,
          actor,
        }),
      );
      await audit({ action: "INVOICE_PAID", entity: "AccountingInvoice", entityId: input.id, after: result });
      refresh(input.id);
      revalidatePath("/muhasebe");
      return { bookingNumber: result.bookingNumber };
    },
  });
  return run(input);
}

/** İptal (Storno): numara korunur; ödenmişse gelir fişi ters kaydedilir. */
export async function cancelInvoiceAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: invoiceCancelSchema,
    handler: async ({ input, user, audit }) => {
      await getDb().$transaction(async (tx) => {
        const invoice = await loadInvoice(input.id, tx);
        if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") throw new ActionError("accounting.invoices.errors.cannotCancel");
        if (invoice.status === "PAID" || invoice.paidCents > 0) {
          await reverseSourcedBooking({
            tx,
            actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
            sourceType: INVOICE_SOURCE,
            sourceId: invoice.id,
            reason: input.reason,
          });
        }
        await tx.accountingInvoice.update({
          where: { id: invoice.id },
          data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: input.reason },
        });
      });
      await audit({ action: "INVOICE_CANCEL", entity: "AccountingInvoice", entityId: input.id, after: { reason: input.reason } });
      refresh(input.id);
      revalidatePath("/muhasebe");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function saveInvoiceSettingsAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: invoiceSettingsSchema,
    handler: async ({ input, audit }) => {
      const data = {
        defaultTaxRate: Number(input.defaultTaxRate),
        taxNote: input.taxNote || null,
        paymentDays: Number(input.paymentDays),
        bankDetails: input.bankDetails || null,
        footerText: input.footerText || null,
        incomeCategoryId: input.incomeCategoryId || null,
      };
      await getDb().accountingInvoiceSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });
      await audit({ action: "UPDATE", entity: "AccountingInvoiceSettings", entityId: "singleton", after: { defaultTaxRate: data.defaultTaxRate, paymentDays: data.paymentDays } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
