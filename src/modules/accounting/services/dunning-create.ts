import "server-only";

import { getDb } from "@/shared/db";

import { defaultInterestRate, dunningFeeCents, lateInterestCents, nextDunningLevel } from "./dunning";
import { openCents } from "./invoice-payments";

/** İhtar oluşturulamadı; `code` çeviri anahtarıdır. */
export class DunningError extends Error {}

type Db = ReturnType<typeof getDb>;

/**
 * İhtar oluşturma çekirdeği (ACC-6): bir sonraki kademe, ücret (ayarlar), § 288 BGB faizi (B2B: alıcının
 * USt-IdNr.'si varsa) ve yeni ödeme tarihi. Fatura değiştirilmez; yalnız `AccountingDunning` kaydı yazılır
 * (e-posta/PDF gönderimi yok). Hem ihtar eylemi hem sekreter önerisi bu fonksiyonu kullanır.
 */
export async function createDunningForInvoice(
  invoiceId: string,
  actor: { id: string; label: string },
  today: Date,
  db: Db = getDb(),
): Promise<{ id: string; level: number; invoiceNumber: string | null; invoiceId: string }> {
  const [invoice, settings] = await Promise.all([
    db.accountingInvoice.findUnique({ where: { id: invoiceId }, include: { contact: { select: { vatId: true, einvoiceType: true } }, dunnings: { orderBy: { level: "desc" }, take: 1 } } }),
    db.accountingInvoiceSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!invoice || invoice.kind !== "INVOICE" || invoice.status !== "ISSUED") throw new DunningError("accounting.dunning.errors.notDunnable");
  const open = openCents(invoice);
  const due = invoice.dueDate ?? invoice.issueDate;
  const intervalDays = settings?.dunningIntervalDays ?? 14;
  const last = invoice.dunnings[0] ?? null;
  const level = nextDunningLevel({ dueDate: due, today, last, intervalDays });
  if (!open || !level) throw new DunningError("accounting.dunning.errors.notDue");
  const business = Boolean(invoice.contact?.vatId) || invoice.contact?.einvoiceType === "B2B" || invoice.contact?.einvoiceType === "PUBLIC";
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
      createdById: actor.id,
      createdByLabel: actor.label,
    },
  });
  return { id: created.id, level, invoiceNumber: invoice.number, invoiceId: invoice.id };
}

/** İhtar kesilebilecek (vadesi geçmiş, açık bakiyeli, sıradaki kademesi gelmiş) faturalar; en çok `limit`. */
export async function listDunnableInvoices(today: Date, limit = 20, db: Db = getDb()): Promise<{ id: string; level: number }[]> {
  const [invoices, settings] = await Promise.all([
    db.accountingInvoice.findMany({
      where: { kind: "INVOICE", status: "ISSUED", dueDate: { lt: today } },
      select: { id: true, dueDate: true, issueDate: true, grossCents: true, paidCents: true, skontoCents: true, dunnings: { orderBy: { level: "desc" }, take: 1, select: { level: true, dunningDate: true } } },
      orderBy: { dueDate: "asc" },
      take: 200,
    }),
    db.accountingInvoiceSettings.findUnique({ where: { id: "singleton" }, select: { dunningIntervalDays: true } }),
  ]);
  const intervalDays = settings?.dunningIntervalDays ?? 14;
  const result: { id: string; level: number }[] = [];
  for (const invoice of invoices) {
    if (!openCents(invoice)) continue;
    const level = nextDunningLevel({ dueDate: invoice.dueDate ?? invoice.issueDate, today, last: invoice.dunnings[0] ?? null, intervalDays });
    if (level) result.push({ id: invoice.id, level });
    if (result.length >= limit) break;
  }
  return result;
}
