"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/shared/db";
import { removeFile } from "@/shared/files";
import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { payableCancelSchema, payableIdSchema, payablePaySchema, payableSchema } from "../schemas/payable";
import { applyPayablePayment, PAYABLE_SOURCE } from "../services/payable-payment-service";
import { reverseSourcedBooking } from "../services/sourced-bookings";
import { parseDateOnly } from "../utils";

const refresh = (id?: string) => {
  revalidatePath("/muhasebe/gelen-faturalar");
  if (id) revalidatePath(`/muhasebe/gelen-faturalar/${id}`);
};
const date = (value: string) => {
  const parsed = parseDateOnly(value);
  if (!parsed) throw new ActionError("accounting.validation.bookingDateInvalid");
  return parsed;
};

/** Kaydet + onayla: taslak/ödenmemiş fatura düzenlenir ve "ödenecek" (OPEN) olur. */
export async function savePayableAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: payableSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.accountingPayable.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("accounting.payables.errors.notFound");
      if (existing.paidCents > 0 || existing.status === "PAID" || existing.status === "CANCELLED") throw new ActionError("accounting.payables.errors.locked");
      const groups = [
        { rate: 19, net: input.net19, tax: input.tax19 },
        { rate: 7, net: input.net7, tax: input.tax7 },
        { rate: 0, net: input.net0, tax: "" },
      ]
        .map((group) => {
          const netCents = group.net ? toCents(group.net) ?? 0 : 0;
          const taxCents = group.tax ? toCents(group.tax) ?? 0 : Math.round((netCents * group.rate) / 100);
          return { rate: group.rate, netCents, taxCents };
        })
        .filter((group) => group.netCents > 0);
      if (!groups.length) throw new ActionError("accounting.payables.errors.amountRequired", { net19: ["accounting.payables.errors.amountRequired"] });
      const netCents = groups.reduce((sum, group) => sum + group.netCents, 0);
      const taxCents = groups.reduce((sum, group) => sum + group.taxCents, 0);
      await db.accountingPayable.update({
        where: { id: input.id },
        data: {
          status: "OPEN",
          contactId: input.contactId || null,
          supplierName: input.supplierName,
          supplierVatId: input.supplierVatId || null,
          supplierTaxNumber: input.supplierTaxNumber || null,
          supplierAddress: input.supplierAddress || null,
          supplierIban: input.supplierIban ? input.supplierIban.replace(/\s/g, "").toUpperCase() : null,
          number: input.number || null,
          issueDate: date(input.issueDate),
          dueDate: input.dueDate ? date(input.dueDate) : null,
          serviceDate: input.serviceDate || null,
          categoryId: input.categoryId,
          byRate: groups,
          netCents,
          taxCents,
          grossCents: netCents + taxCents,
          notes: input.notes || null,
        },
      });
      await audit({ action: "UPDATE", entity: "AccountingPayable", entityId: input.id, after: { grossCents: netCents + taxCents, status: "OPEN" } });
      refresh(input.id);
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function payPayableAction(input: unknown): Promise<ActionResult<{ bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: payablePaySchema,
    handler: async ({ input, user, audit }) => {
      const result = await getDb().$transaction((tx) =>
        applyPayablePayment(tx, {
          payableId: input.id,
          paidDate: date(input.paidDate),
          accountId: input.accountId,
          amountCents: input.amount ? toCents(input.amount) : null,
          actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
        }),
      );
      await audit({ action: "UPDATE", entity: "AccountingPayable", entityId: input.id, after: { paid: result.amountCents, bookingNumber: result.bookingNumber } });
      refresh(input.id);
      revalidatePath("/muhasebe");
      return { bookingNumber: result.bookingNumber };
    },
  });
  return run(input);
}

/** İptal: ödeme fişleri ters kaydedilir; belge (Beleg) saklanmaya devam eder (GoBD). */
export async function cancelPayableAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: payableCancelSchema,
    handler: async ({ input, user, audit }) => {
      await getDb().$transaction(async (tx) => {
        const payable = await tx.accountingPayable.findUnique({ where: { id: input.id } });
        if (!payable) throw new ActionError("accounting.payables.errors.notFound");
        if (payable.status === "CANCELLED") return;
        if (payable.paidCents > 0) {
          await reverseSourcedBooking({ tx, actor: { id: user.id, label: buildUserLabel(user.name, user.email) }, sourceType: PAYABLE_SOURCE, sourceId: payable.id, reason: input.reason });
        }
        await tx.accountingPayable.update({ where: { id: payable.id }, data: { status: "CANCELLED", cancelledAt: new Date(), notes: [payable.notes, input.reason].filter(Boolean).join("\n") } });
      });
      await audit({ action: "UPDATE", entity: "AccountingPayable", entityId: input.id, after: { status: "CANCELLED", reason: input.reason } });
      refresh(input.id);
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** Taslak (henüz onaylanmamış) yükleme silinebilir — dosyasıyla birlikte. */
export async function deletePayableDraftAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: payableIdSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const payable = await db.accountingPayable.findUnique({ where: { id: input.id } });
      if (!payable) throw new ActionError("accounting.payables.errors.notFound");
      if (payable.status !== "DRAFT") throw new ActionError("accounting.payables.errors.locked");
      await db.accountingPayable.delete({ where: { id: payable.id } });
      if (payable.storagePath) await removeFile(payable.storagePath);
      await audit({ action: "DELETE", entity: "AccountingPayable", entityId: payable.id });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
