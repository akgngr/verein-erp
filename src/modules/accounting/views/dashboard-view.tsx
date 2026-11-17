import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { SurfaceCards } from "@/modules/system/ui";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getDb } from "@/shared/db";
import { formatMoney } from "@/shared/money";

import { CashflowChart } from "../components/dashboard/cashflow-chart";
import { ExpenseDonut } from "../components/dashboard/expense-donut";
import { AttentionList, KpiTile, LiquidityHero, UpcomingTimeline, type AttentionItem, type TimelineItem } from "../components/dashboard/widgets";
import { accountingPermissions } from "../permissions";
import { getDashboardOverview, OUTLOOK_DAYS } from "../queries/get-dashboard-overview";
import { getOverdueInvoiceSummary } from "../queries/get-overdue-invoice-summary";
import { getSettings } from "../queries/get-settings";
import { forecastLiquidity, percentChange } from "../services/dashboard-outlook";
import { countMissingReceipts } from "../services/report-builders";
import { taxDeadlines } from "../services/tax-calendar";
import { berlinToday } from "../utils";

type RawParams = Record<string, string | string[] | undefined>;
type Period = "year" | "quarter" | "month";

function parameter(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * ACC-10 live accounting dashboard. Read-only: shows the current position (liquidity, period KPIs),
 * what is coming (receivables, payables, tax deadlines) and what needs attention. No payments, reminders or filings.
 * The AI status card is contributed by the AI module through the "accounting.overview" surface (system module).
 */
export async function AccountingDashboardView({ searchParams }: { searchParams: Promise<RawParams> }) {
  try {
    await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("accounting.dashboard");
  const locale = await getLocale();
  const today = berlinToday();
  const currentYear = today.getUTCFullYear();
  const raw = await searchParams;
  const requestedYear = parameter(raw.year);
  const year = requestedYear && /^\d{4}$/.test(requestedYear) && Number(requestedYear) >= 2000 && Number(requestedYear) <= currentYear
    ? Number(requestedYear)
    : currentYear;
  const requestedPeriod = parameter(raw.period);
  const period: Period = requestedPeriod === "month" || requestedPeriod === "quarter" ? requestedPeriod : "year";
  const rawPart = parameter(raw.part);
  const part = rawPart && /^\d{1,2}$/.test(rawPart) ? Number(rawPart) : 1;
  const validPart = period === "quarter" ? (part >= 1 && part <= 4 ? part : 1)
    : period === "month" ? (part >= 1 && part <= 12 ? part : 1) : 1;

  const db = getDb();
  const [overview, missingReceiptCount, overdueOpen, settings, unmatchedBankCount, draftPayableCount] = await Promise.all([
    getDashboardOverview({ year, period, part: validPart, today }),
    countMissingReceipts(year),
    getOverdueInvoiceSummary(today),
    getSettings(),
    db.accountingBankTransaction.count({ where: { status: "OPEN" } }),
    db.accountingPayable.count({ where: { status: "DRAFT" } }),
  ]);

  const deadlineOptions = { vatPeriod: settings.tax.vatPeriod, extension: settings.tax.vatExtension, smallBusiness: settings.tax.smallBusiness };
  const horizon = new Date(today.getTime() + 60 * 86_400_000);
  const deadlines = [...taxDeadlines(currentYear, deadlineOptions), ...taxDeadlines(currentYear + 1, deadlineOptions)]
    .filter((deadline) => deadline.due >= today && deadline.due <= horizon)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, 3);

  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(Date.UTC(2000, index, 1)).toLocaleDateString(locale, { month: "short", timeZone: "UTC" }));
  const periodLabel = period === "year" ? String(year)
    : period === "quarter" ? `${t("quarter", { n: validPart })} ${year}`
    : `${monthNames[validPart - 1]} ${year}`;
  const periodLink = (kind: Period, n = 1, y = year) => `/muhasebe/panel?year=${y}&period=${kind}&part=${n}`;

  const incomingCents = overview.receivables.overdue.cents + overview.receivables.upcoming.cents;
  const outgoingCents = overview.payables.overdue.cents + overview.payables.upcoming.cents;
  const forecastCents = forecastLiquidity({ balanceCents: overview.liquidityCents, receivablesCents: incomingCents, payablesCents: outgoingCents });

  const timeline: TimelineItem[] = [
    ...overview.timeline.map((item) => ({
      kind: item.kind,
      key: `${item.kind}-${item.id}`,
      title: item.party || item.label,
      subtitle: item.label,
      date: item.dueDate,
      cents: item.cents,
      href: item.kind === "receivable" ? `/muhasebe/faturalar/${item.id}` : `/muhasebe/gelen-faturalar/${item.id}`,
    })),
    ...deadlines.map((deadline) => ({
      kind: "tax" as const,
      key: `tax-${deadline.key}-${deadline.period}`,
      title: t(`taxDeadlineKey.${deadline.key}`),
      subtitle: deadline.period,
      date: deadline.due,
      cents: null,
      href: "/muhasebe/vergi",
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);

  const attention: AttentionItem[] = [
    ...(overdueOpen.count > 0 ? [{ key: "overdue", severity: "danger" as const, text: t("overdue", { count: overdueOpen.count, amount: formatMoney(overdueOpen.cents) }), action: t("inspectInvoices"), href: "/muhasebe/faturalar" }] : []),
    ...(overview.payables.overdue.count > 0 ? [{ key: "payablesOverdue", severity: "danger" as const, text: t("payablesOverdue", { count: overview.payables.overdue.count, amount: formatMoney(overview.payables.overdue.cents) }), action: t("inspectPayables"), href: "/muhasebe/gelen-faturalar" }] : []),
    ...(unmatchedBankCount > 0 ? [{ key: "bank", severity: "warning" as const, text: t("unmatchedBank", { count: unmatchedBankCount }), action: t("inspectBank"), href: "/muhasebe/banka?durum=open" }] : []),
    ...(draftPayableCount > 0 ? [{ key: "draftPayables", severity: "warning" as const, text: t("draftPayables", { count: draftPayableCount }), action: t("inspectPayables"), href: "/muhasebe/gelen-faturalar" }] : []),
    ...(missingReceiptCount > 0 ? [{ key: "receipts", severity: "warning" as const, text: t("missingReceipts", { count: missingReceiptCount, year }), action: t("inspectBookings"), href: `/muhasebe?filter.year=${year}&filter.missingReceipt=1` }] : []),
    ...(deadlines[0] ? [{ key: "tax", severity: "info" as const, text: t("taxDeadline", { kind: t(`taxDeadlineKey.${deadlines[0].key}`), period: deadlines[0].period, date: deadlines[0].due.toLocaleDateString(locale, { timeZone: "UTC" }) }), action: t("inspectTax"), href: "/muhasebe/vergi" }] : []),
  ];

  const changeLabel = t("vsLastYear", { year: year - 1 });
  const trendIncome = overview.months.map((month) => month.incomeCents);
  const trendExpense = overview.months.map((month) => month.expenseCents);
  const trendNet = overview.months.reduce<number[]>((acc, month) => [...acc, (acc.at(-1) ?? 0) + month.netCents], []);
  const chip = (active: boolean) =>
    `erp-motion-interactive rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-[var(--ui-surface-card)] text-foreground shadow-[var(--ui-shadow-card)]" : "text-ink-500 hover:text-foreground"}`;

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("liveDescription", { period: periodLabel })}
        actions={<Link href="/muhasebe" className="text-sm font-medium text-accent hover:underline">{t("bookings")}</Link>}
      />

      <nav aria-label={t("filterLabel")} className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-[var(--ui-surface-muted)] p-1">
          {[year - 1, year].filter((y) => y >= 2000).map((y) => (
            <Link key={y} href={periodLink(period, validPart, y)} aria-current={y === year ? "true" : undefined} className={chip(y === year)}>{y}</Link>
          ))}
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-[var(--ui-surface-muted)] p-1">
          <Link href={periodLink("year")} aria-current={period === "year" ? "page" : undefined} className={chip(period === "year")}>{t("year")}</Link>
          {[1, 2, 3, 4].map((q) => (
            <Link key={q} href={periodLink("quarter", q)} aria-current={period === "quarter" && validPart === q ? "page" : undefined}
              className={chip(period === "quarter" && validPart === q)}>{t("quarterShort", { n: q })}</Link>
          ))}
        </div>
        <div role="group" aria-label={t("monthLabel")} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[var(--ui-surface-muted)] p-1">
          {monthNames.map((name, index) => (
            <Link key={name} href={periodLink("month", index + 1)}
              aria-current={period === "month" && validPart === index + 1 ? "page" : undefined}
              className={chip(period === "month" && validPart === index + 1)}>{name}</Link>
          ))}
        </div>
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <LiquidityHero
            labels={{
              title: t("liquidity"),
              asOf: t("asOf", { date: today.toLocaleDateString(locale, { timeZone: "UTC" }) }),
              forecast: t("forecast", { days: OUTLOOK_DAYS }),
              forecastHint: t("forecastHint"),
              incoming: t("incoming"),
              outgoing: t("outgoing"),
              noAccounts: t("noAccounts"),
            }}
            liquidityCents={overview.liquidityCents}
            forecastCents={forecastCents}
            incomingCents={incomingCents}
            outgoingCents={outgoingCents}
            accounts={overview.balances}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <KpiTile index={0} label={t("income")} cents={overview.current.incomeCents} change={percentChange(overview.current.incomeCents, overview.previous.incomeCents)}
              changeLabel={changeLabel} noChange={t("noComparison")} upIsGood icon={ArrowUpRight} tone="success" trend={trendIncome} />
            <KpiTile index={1} label={t("expense")} cents={overview.current.expenseCents} change={percentChange(overview.current.expenseCents, overview.previous.expenseCents)}
              changeLabel={changeLabel} noChange={t("noComparison")} upIsGood={false} icon={ArrowDownRight} tone="accent" trend={trendExpense} />
            <KpiTile index={2} label={t("difference")} cents={overview.current.netCents} change={percentChange(overview.current.netCents, overview.previous.netCents)}
              changeLabel={changeLabel} noChange={t("noComparison")} upIsGood icon={Scale} tone="neutral" trend={trendNet} />
          </div>

          <CashflowChart
            months={overview.months}
            highlight={year === currentYear ? today.getUTCMonth() : undefined}
            labels={{
              title: t("cashflowTitle", { year }),
              description: t("cashflowDescription"),
              income: t("income"),
              expense: t("expense"),
              net: t("cumulativeNet"),
              tableToggle: t("showTable"),
              monthColumn: t("monthLabel"),
              months: monthNames,
            }}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <UpcomingTimeline
              items={timeline}
              locale={locale}
              labels={{
                title: t("upcomingTitle"),
                description: t("upcomingDescription", { days: OUTLOOK_DAYS }),
                empty: t("upcomingEmpty"),
                receivable: t("receivable"),
                payable: t("payable"),
                tax: t("taxItem"),
              }}
            />
            <ExpenseDonut
              slices={overview.expenses.top}
              otherCents={overview.expenses.otherCents}
              labels={{
                title: t("expenseMixTitle"),
                description: t("expenseMixDescription", { period: periodLabel }),
                other: t("other"),
                uncategorized: t("uncategorized"),
                empty: t("expenseMixEmpty"),
                total: t("total"),
              }}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-20" aria-label={t("asideLabel")}>
          <SurfaceCards surface="accounting.overview" placement="aside" />
          <AttentionList items={attention} labels={{ title: t("recommendations"), empty: t("noWarnings") }} />
        </aside>
      </div>

      <p className="text-xs text-ink-500">
        {t("basis")} {t("taxMethod", { method: settings.tax.taxMethod })}
      </p>
    </section>
  );
}
