import "server-only";

import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { defineModuleSecretary, defineSecretaryAction, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { accountingPermissions } from "./permissions";
import { getOverdueInvoiceSummary } from "./queries/get-overdue-invoice-summary";
import { openCentsOf } from "./services/dashboard-outlook";
import { createDunningForInvoice, DunningError, listDunnableInvoices } from "./services/dunning-create";
import { getTaxSettings } from "./services/tax";
import { type Deadline, taxDeadlines } from "./services/tax-calendar";
import { berlinToday } from "./utils";

/** Vergi tarihinin özette görüneceği ufuk (gün) ve "yakın" eşiği. */
const TAX_HORIZON_DAYS = 14;
const TAX_WARNING_DAYS = 5;
const DAY = 86_400_000;

export type AccountingSnapshot = {
  overdueInvoices: { count: number; cents: number };
  overduePayables: { count: number; cents: number };
  draftPayables: number;
  openBankTransactions: number;
  nextTaxDeadline: Deadline | null;
  /** İhtar kesilebilecek faturalar (sekreter önerisi için; kimlikler yalnız sunucuda kalır). */
  dunnable?: { id: string; level: number }[];
};

/** Bir öneride en çok kaç faturaya ihtar kaydı oluşturulur. */
export const DUNNING_PROPOSAL_LIMIT = 20;

/** Sabah özeti öğeleri. Yalnız sayı ve toplam tutar; kişi/cari adı yok. */
export function buildAccountingItems(snapshot: AccountingSnapshot, context: Pick<SecretaryContext, "t">, today: Date): BriefingItem[] {
  const { t } = context;
  const items: BriefingItem[] = [];
  const isoDay = today.toISOString().slice(0, 10);

  if (snapshot.overdueInvoices.count > 0) {
    items.push({
      id: "accounting:overdue-invoices",
      module: "accounting",
      kind: "overdue-invoices",
      severity: "danger",
      title: t("secretary.overdueInvoices", { count: snapshot.overdueInvoices.count }),
      count: snapshot.overdueInvoices.count,
      amountCents: snapshot.overdueInvoices.cents,
      // Kural kaynaklı öneri: toplayıcı bunu şifreli öneriye çevirir; istemciye yalnız proposalId gider.
      ...(snapshot.dunnable?.length
        ? { suggestion: { action: "dunning", payload: { invoiceIds: snapshot.dunnable.map((invoice) => invoice.id) } } }
        : {}),
      dueAt: isoDay,
      href: "/muhasebe/faturalar",
    });
  }
  if (snapshot.overduePayables.count > 0) {
    items.push({
      id: "accounting:overdue-payables",
      module: "accounting",
      kind: "overdue-payables",
      severity: "danger",
      title: t("secretary.overduePayables", { count: snapshot.overduePayables.count }),
      count: snapshot.overduePayables.count,
      amountCents: snapshot.overduePayables.cents,
      dueAt: isoDay,
      href: "/muhasebe/gelen-faturalar",
    });
  }
  if (snapshot.draftPayables > 0) {
    items.push({
      id: "accounting:payables-review",
      module: "accounting",
      kind: "payables-review",
      severity: "warning",
      title: t("secretary.draftPayables", { count: snapshot.draftPayables }),
      count: snapshot.draftPayables,
      href: "/muhasebe/gelen-faturalar",
    });
  }
  if (snapshot.openBankTransactions > 0) {
    items.push({
      id: "accounting:bank-open",
      module: "accounting",
      kind: "bank-open",
      severity: "info",
      title: t("secretary.openBankTransactions", { count: snapshot.openBankTransactions }),
      count: snapshot.openBankTransactions,
      href: "/muhasebe/banka",
    });
  }
  const deadline = snapshot.nextTaxDeadline;
  if (deadline) {
    const days = Math.round((deadline.due.getTime() - today.getTime()) / DAY);
    items.push({
      // Kimlik dönem başına sabit: kapatılan bir beyan tarihi sonrakini gizlemez.
      id: `accounting:tax-deadline:${deadline.key}-${deadline.period.replace(/[^A-Za-z0-9_-]/g, "-")}`,
      module: "accounting",
      kind: "tax-deadline",
      severity: days <= TAX_WARNING_DAYS ? "warning" : "info",
      title: t("secretary.taxDeadline", { tax: t(`secretary.taxKinds.${deadline.key}`), period: deadline.period, days }),
      dueAt: deadline.due.toISOString().slice(0, 10),
      href: "/muhasebe/vergi",
    });
  }
  return items;
}

/** En yakın vergi tarihi (bugün dahil, ufuk içinde). */
export function pickTaxDeadline(deadlines: readonly Deadline[], today: Date, horizonDays = TAX_HORIZON_DAYS): Deadline | null {
  const end = today.getTime() + horizonDays * DAY;
  return [...deadlines]
    .filter((deadline) => deadline.due.getTime() >= today.getTime() && deadline.due.getTime() <= end)
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0] ?? null;
}

async function loadSnapshot(today: Date): Promise<AccountingSnapshot> {
  const db = getDb();
  const [overdueInvoices, overduePayableRows, draftPayables, openBankTransactions, tax, dunnable] = await Promise.all([
    getOverdueInvoiceSummary(today),
    db.accountingPayable.findMany({
      where: { status: "OPEN", dueDate: { lt: today } },
      select: { dueDate: true, grossCents: true, paidCents: true },
      take: 2000,
    }),
    db.accountingPayable.count({ where: { status: "DRAFT" } }),
    db.accountingBankTransaction.count({ where: { status: "OPEN" } }),
    getTaxSettings(db),
    listDunnableInvoices(today, DUNNING_PROPOSAL_LIMIT, db),
  ]);
  const payableCents = overduePayableRows.map(openCentsOf).filter((cents) => cents > 0);
  const options = { vatPeriod: tax.vatPeriod, extension: tax.vatExtension, smallBusiness: tax.smallBusiness };
  const year = today.getUTCFullYear();
  return {
    overdueInvoices,
    dunnable,
    overduePayables: { count: payableCents.length, cents: payableCents.reduce((sum, cents) => sum + cents, 0) },
    draftPayables,
    openBankTransactions,
    nextTaxDeadline: pickTaxDeadline([...taxDeadlines(year, options), ...taxDeadlines(year + 1, options)], today),
  };
}

const dunningPayload = z.object({ invoiceIds: z.array(z.string().min(1).max(64)).min(1).max(DUNNING_PROPOSAL_LIMIT) }).strict();

/**
 * Öneri eylemi: vadesi geçmiş faturalar için sıradaki ihtar kademesini kaydeder (ACC-6 ile aynı çekirdek).
 * Yalnız `AccountingDunning` kaydı yazılır; e-posta veya PDF gönderilmez (risk: internal). Onay anında
 * kaynak durumu (hangi faturalar hâlâ ihtar kesilebilir) değiştiyse öneri bayat sayılır ve çalışmaz.
 */
export const dunningAction = defineSecretaryAction({
  key: "dunning",
  permission: { definition: accountingPermissions, action: "update" },
  risk: "internal",
  schema: dunningPayload,
  preview: async (payload, context) => ({
    title: context.t("secretary.dunningProposal", { count: payload.invoiceIds.length }),
    detail: context.t("secretary.dunningProposalDetail"),
  }),
  snapshot: async (payload) => {
    const wanted = new Set(payload.invoiceIds);
    const current = (await listDunnableInvoices(berlinToday(), 200)).filter((invoice) => wanted.has(invoice.id));
    return current.length ? current.sort((a, b) => a.id.localeCompare(b.id)) : null;
  },
  editHref: () => "/muhasebe/faturalar",
  execute: async (payload, context) => {
    const today = berlinToday(context.now);
    for (const invoiceId of payload.invoiceIds) {
      try {
        const created = await createDunningForInvoice(invoiceId, { id: context.user.id, label: "Sekreter önerisi" }, today);
        await writeAudit({
          userId: context.user.id,
          action: "CREATE",
          entity: "AccountingDunning",
          entityId: created.id,
          after: { invoice: created.invoiceNumber, level: created.level, source: "secretary" },
        });
      } catch (error) {
        // Bu arada ödenen/ihtar kesilen fatura atlanır; diğerleri etkilenmez.
        if (!(error instanceof DunningError)) throw error;
      }
    }
    return { href: "/muhasebe/faturalar" };
  },
});

export const secretary = defineModuleSecretary({
  module: "accounting",
  providers: [{
    key: "finance",
    permission: { definition: accountingPermissions, action: "view" },
    collect: async (context) => {
      const today = berlinToday(context.now);
      return buildAccountingItems(await loadSnapshot(today), context, today);
    },
  }],
  actions: [dunningAction],
});
