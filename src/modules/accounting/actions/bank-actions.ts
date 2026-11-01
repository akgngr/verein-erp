"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { bankBookSchema, bankImportSchema, bankRuleIdSchema, bankStatusSchema } from "../schemas/bank";
import { BankParseError, detectFormat, parseStatement, transactionKey } from "../services/bank-parsers";
import { applyInvoicePayment } from "../services/invoice-payment-service";
import { applyPayablePayment } from "../services/payable-payment-service";
import { createSourcedBooking } from "../services/sourced-bookings";

const BANK_SOURCE = "BANK";
const refresh = () => revalidatePath("/muhasebe/banka");

/**
 * Ekstre içe aktar (ACC-4): satırlar ayrıştırılır, hash ile mükerrerler atlanır. Dosyanın kendisi
 * saklanmaz (KVKK: yalnızca muhasebe için gerekli alanlar). Hiçbir fiş otomatik YAZILMAZ.
 */
export async function importBankStatementAction(input: unknown): Promise<ActionResult<{ total: number; created: number; format: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: bankImportSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const account = await db.accountingAccount.findUnique({ where: { id: input.accountId }, select: { isActive: true } });
      if (!account?.isActive) throw new ActionError("accounting.validation.accountRequired");
      const format = input.format === "AUTO" ? detectFormat(input.content) : input.format;
      let parsed;
      try {
        parsed = parseStatement(input.content, format);
      } catch (error) {
        if (error instanceof BankParseError) throw new ActionError("accounting.bank.errors.parse");
        throw error;
      }
      if (!parsed.length) throw new ActionError("accounting.bank.errors.noRows");
      if (parsed.some((row) => row.currency !== "EUR")) throw new ActionError("accounting.bank.errors.currency");
      const rows = parsed.map((row) => ({
        ...row,
        hash: createHash("sha256").update(transactionKey(input.accountId, row)).digest("hex"),
      }));
      const existing = new Set(
        (await db.accountingBankTransaction.findMany({ where: { hash: { in: rows.map((row) => row.hash) } }, select: { hash: true } })).map((row) => row.hash),
      );
      // Aynı dosyada birebir aynı iki satır: ikinciye sıra eki (gerçekten iki ayrı ödeme olabilir).
      const seen = new Map<string, number>();
      const fresh = rows
        .map((row) => {
          const count = seen.get(row.hash) ?? 0;
          seen.set(row.hash, count + 1);
          return count ? { ...row, hash: `${row.hash}:${count}` } : row;
        })
        .filter((row) => !existing.has(row.hash));
      const actorLabel = buildUserLabel(user.name, user.email);
      const created = await db.accountingBankImport.create({
        data: {
          accountId: input.accountId,
          format,
          fileName: input.fileName,
          totalCount: rows.length,
          newCount: fresh.length,
          createdById: user.id,
          createdByLabel: actorLabel,
          transactions: {
            create: fresh.map((row) => ({
              accountId: input.accountId,
              hash: row.hash,
              bookingDate: new Date(`${row.bookingDate}T00:00:00Z`),
              valueDate: row.valueDate ? new Date(`${row.valueDate}T00:00:00Z`) : null,
              amountCents: row.amountCents,
              currency: row.currency,
              counterpartyName: row.counterpartyName?.slice(0, 200) ?? null,
              counterpartyIban: row.counterpartyIban?.slice(0, 34) ?? null,
              purpose: row.purpose.slice(0, 500),
              reference: row.reference?.slice(0, 100) ?? null,
            })),
          },
        },
      });
      await audit({ action: "IMPORT", entity: "AccountingBankImport", entityId: created.id, after: { format, total: rows.length, created: fresh.length } });
      refresh();
      return { total: rows.length, created: fresh.length, format };
    },
  });
  return run(input);
}

/** Satırı fişe bağla: açık fatura tahsilatı ya da kategori fişi (+ isteğe bağlı kural öğrenme). */
export async function bookBankTransactionAction(input: unknown): Promise<ActionResult<{ bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: bankBookSchema,
    handler: async ({ input, user, audit }) => {
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      const result = await getDb().$transaction(async (tx) => {
        const row = await tx.accountingBankTransaction.findUnique({ where: { id: input.id } });
        if (!row) throw new ActionError("accounting.bank.errors.notFound");
        if (row.status !== "OPEN") throw new ActionError("accounting.bank.errors.notOpen");
        let bookingNumber: string;
        let bookingIds: string[];
        let invoiceId: string | null = null;
        if (input.mode === "invoice") {
          if (row.amountCents <= 0) throw new ActionError("accounting.bank.errors.invoiceNeedsCredit");
          const paid = await applyInvoicePayment(tx, {
            invoiceId: input.invoiceId,
            paidDate: row.bookingDate,
            accountId: row.accountId,
            categoryId: input.categoryId,
            amountCents: row.amountCents,
            closeRemainder: input.closeRemainder,
            actor,
          });
          bookingNumber = paid.bookingNumber;
          bookingIds = paid.bookingIds;
          invoiceId = input.invoiceId;
        } else if (input.mode === "payable") {
          if (row.amountCents >= 0) throw new ActionError("accounting.bank.errors.payableNeedsDebit");
          const paid = await applyPayablePayment(tx, { payableId: input.payableId, paidDate: row.bookingDate, accountId: row.accountId, amountCents: -row.amountCents, actor });
          bookingNumber = paid.bookingNumber;
          bookingIds = paid.bookingIds;
        } else {
          const text = [row.counterpartyName, row.purpose].filter(Boolean).join(" – ");
          const booking = await createSourcedBooking({
            tx,
            actor,
            type: row.amountCents >= 0 ? "INCOME" : "EXPENSE",
            sourceType: BANK_SOURCE,
            sourceId: row.id,
            bookingDate: row.bookingDate,
            accountId: row.accountId,
            categoryId: input.categoryId,
            amountCents: Math.abs(row.amountCents),
            taxRate: input.taxRate,
            description: (text || "Bank").slice(0, 300), // i18n-ignore: Buchungstext
            receiptReference: row.reference?.slice(0, 100) ?? null,
          });
          bookingNumber = booking.bookingNumber;
          bookingIds = [booking.id];
          if (input.learnRule !== "NONE") {
            const pattern = (input.learnRule === "COUNTERPARTY" ? row.counterpartyName : row.purpose)?.trim().toLowerCase().slice(0, 100);
            if (pattern) {
              const direction = row.amountCents >= 0 ? "INCOME" : "EXPENSE";
              await tx.accountingBankRule.upsert({
                where: { field_pattern_direction: { field: input.learnRule, pattern, direction } },
                update: { categoryId: input.categoryId, taxRate: input.taxRate, hits: { increment: 1 } },
                create: { field: input.learnRule, pattern, direction, categoryId: input.categoryId, taxRate: input.taxRate, hits: 1 },
              });
            }
          }
        }
        await tx.accountingBankTransaction.update({ where: { id: row.id }, data: { status: "BOOKED", bookingIds: bookingIds.join(","), invoiceId } });
        return { bookingNumber, mode: input.mode };
      });
      await audit({ action: "UPDATE", entity: "AccountingBankTransaction", entityId: input.id, after: result });
      refresh();
      revalidatePath("/muhasebe");
      return { bookingNumber: result.bookingNumber };
    },
  });
  return run(input);
}

/** Özel (Privatentnahme/-einlage) / yok say / geri aç. Fişe bağlı satır değiştirilemez. */
export async function setBankTransactionStatusAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: bankStatusSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const row = await db.accountingBankTransaction.findUnique({ where: { id: input.id }, select: { status: true } });
      if (!row) throw new ActionError("accounting.bank.errors.notFound");
      if (row.status === "BOOKED") throw new ActionError("accounting.bank.errors.notOpen");
      await db.accountingBankTransaction.update({ where: { id: input.id }, data: { status: input.status } });
      await audit({ action: "UPDATE", entity: "AccountingBankTransaction", entityId: input.id, before: { status: row.status }, after: { status: input.status } });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function deleteBankRuleAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: bankRuleIdSchema,
    handler: async ({ input, audit }) => {
      await getDb().accountingBankRule.delete({ where: { id: input.id } });
      await audit({ action: "DELETE", entity: "AccountingBankRule", entityId: input.id });
      refresh();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
