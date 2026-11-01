"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions, accountingSetupPermissions } from "../permissions";
import { accountBalanceAt } from "../services/balances";
import { recordJournal } from "../services/journal";
import { berlinToday, parseDateOnly } from "../utils";

const closingSchema = z.object({
  accountId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "accounting.validation.bookingDateInvalid"),
  counted: z.string().trim().regex(/^-?\d{1,9}([.,]\d{1,2})?$/, "accounting.invoices.validation.price"),
  note: z.string().trim().max(300).default(""),
});

/**
 * Kasa günlük kapanışı (ACC-7): o günün defter bakiyesi ile sayılan kasa karşılaştırılır, fark
 * kaydedilir; kapanış kesindir (DB tetikleyicisi) ve o güne/öncesine kasa fişi artık yazılamaz.
 */
export async function createCashClosingAction(input: unknown): Promise<ActionResult<{ differenceCents: number }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: closingSchema,
    handler: async ({ input, user, audit }) => {
      const date = parseDateOnly(input.date);
      if (!date || date > berlinToday()) throw new ActionError("accounting.gobd.errors.closingDate");
      const result = await getDb().$transaction(async (tx) => {
        const account = await tx.accountingAccount.findUnique({ where: { id: input.accountId }, select: { type: true } });
        if (account?.type !== "CASH") throw new ActionError("accounting.gobd.errors.notCash");
        const last = await tx.accountingCashClosing.findFirst({ where: { accountId: input.accountId }, orderBy: { closingDate: "desc" } });
        if (last && last.closingDate >= date) throw new ActionError("accounting.gobd.errors.alreadyClosed");
        const book = await accountBalanceAt(input.accountId, date, tx);
        const counted = toCents(input.counted.replace("-", "")) ?? 0;
        const countedCents = input.counted.trim().startsWith("-") ? -counted : counted;
        const created = await tx.accountingCashClosing.create({
          data: {
            accountId: input.accountId,
            closingDate: date,
            bookBalanceCents: book,
            countedBalanceCents: countedCents,
            differenceCents: countedCents - book,
            note: input.note || null,
            createdById: user.id,
            createdByLabel: buildUserLabel(user.name, user.email),
          },
        });
        return { id: created.id, differenceCents: created.differenceCents, bookBalanceCents: book };
      });
      await audit({ action: "CREATE", entity: "AccountingCashClosing", entityId: result.id, after: { date: input.date, difference: result.differenceCents } });
      revalidatePath("/muhasebe/gobd");
      return { differenceCents: result.differenceCents };
    },
  });
  return run(input);
}

/**
 * Günlük başlatma ("Bestand versiegeln"): günlük devreye girmeden önceki fişler için SEAL
 * olayı yazar. Yalnızca günlükte HİÇ olmayan fişlere uygulanır; değiştirilmiş fişi gizlemez.
 */
export async function sealJournalAction(input: unknown): Promise<ActionResult<{ sealed: number }>> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: z.object({}),
    handler: async ({ user, audit }) => {
      const sealed = await getDb().$transaction(
        async (tx) => {
          const journaled = new Set((await tx.accountingJournal.findMany({ select: { bookingId: true }, distinct: ["bookingId"] })).map((row) => row.bookingId));
          const ids = (await tx.accountingBooking.findMany({ select: { id: true }, orderBy: [{ year: "asc" }, { sequence: "asc" }] })).map((row) => row.id).filter((id) => !journaled.has(id));
          await recordJournal(tx, ids, "SEAL", { id: user.id, label: buildUserLabel(user.name, user.email) });
          return ids.length;
        },
        { timeout: 60_000 },
      );
      await audit({ action: "UPDATE", entity: "AccountingJournal", entityId: "journal", after: { sealed } });
      revalidatePath("/muhasebe/gobd");
      return { sealed };
    },
  });
  return run(input);
}
