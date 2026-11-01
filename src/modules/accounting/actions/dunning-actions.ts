"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { invoiceIdSchema } from "../schemas/invoice";
import { defaultInterestRate, dunningFeeCents, lateInterestCents, nextDunningLevel } from "../services/dunning";
import { openCents } from "../services/invoice-payments";
import { berlinToday } from "../utils";

/**
 * İhtar oluştur (ACC-6): bir sonraki kademe, ücret (ayarlar), § 288 BGB faizi (B2B: alıcının
 * USt-IdNr.'si varsa) ve yeni ödeme tarihi (+ kademe aralığı). Fatura değiştirilmez.
 */
export async function createDunningAction(input: unknown): Promise<ActionResult<{ id: string; level: number }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: invoiceIdSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const today = berlinToday();
      const [invoice, settings] = await Promise.all([
        db.accountingInvoice.findUnique({ where: { id: input.id }, include: { contact: { select: { vatId: true } }, dunnings: { orderBy: { level: "desc" }, take: 1 } } }),
        db.accountingInvoiceSettings.findUnique({ where: { id: "singleton" } }),
      ]);
      if (!invoice || invoice.kind !== "INVOICE" || invoice.status !== "ISSUED") throw new ActionError("accounting.dunning.errors.notDunnable");
      const open = openCents(invoice);
      const due = invoice.dueDate ?? invoice.issueDate;
      const intervalDays = settings?.dunningIntervalDays ?? 14;
      const last = invoice.dunnings[0] ?? null;
      const level = nextDunningLevel({ dueDate: due, today, last, intervalDays });
      if (!open || !level) throw new ActionError("accounting.dunning.errors.notDue");
      const business = Boolean(invoice.contact?.vatId);
      // Zahlungserinnerung (kademe 1) faizsiz ve ücretsiz istenebilir; faiz kademe 2'den itibaren.
      const rate = level >= 2 ? defaultInterestRate(Number(settings?.baseInterestRate ?? 0), business) : 0;
      const created = await db.accountingDunning.create({
        data: {
          invoiceId: invoice.id,
          level,
          dunningDate: today,
          newDueDate: new Date(today.getTime() + Math.min(intervalDays, 14) * 86_400_000),
          openCents: open,
          feeCents: dunningFeeCents(level, { reminder: settings?.dunningFeeReminder ?? 0, first: settings?.dunningFeeFirst ?? 500, second: settings?.dunningFeeSecond ?? 1000 }),
          interestCents: lateInterestCents(open, rate, due, today),
          interestRate: rate.toFixed(2),
          flatFeeCents: level >= 2 && business && settings?.dunningFlatFeeB2B && !invoice.dunnings.some((item) => item.flatFeeCents > 0) ? 4000 : 0,
          createdById: user.id,
          createdByLabel: buildUserLabel(user.name, user.email),
        },
      });
      await audit({ action: "CREATE", entity: "AccountingDunning", entityId: created.id, after: { invoice: invoice.number, level } });
      revalidatePath("/muhasebe/faturalar");
      revalidatePath(`/muhasebe/faturalar/${invoice.id}`);
      return { id: created.id, level };
    },
  });
  return run(input);
}
