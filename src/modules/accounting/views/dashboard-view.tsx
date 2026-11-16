import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getDb } from "@/shared/db";
import { formatMoney } from "@/shared/money";

import { accountingPermissions } from "../permissions";
import { getBookingTotals } from "../queries/get-booking-totals";
import { getBookingPeriodRange } from "../services/dashboard-period";
import { getSettings } from "../queries/get-settings";
import { summarizeOverdueInvoices } from "../services/dashboard-overdue";
import { countMissingReceipts } from "../services/report-builders";
import { berlinToday } from "../utils";

type RawParams = Record<string, string | string[] | undefined>;
type Period = "year" | "quarter" | "month";

function parameter(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Read-only finance dashboard. Does not perform payments, reminder issuance or filing. */
export async function AccountingDashboardView({ searchParams }: { searchParams: Promise<RawParams> }) {
  try {
    await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("accounting.dashboard");
  const now = berlinToday();
  const currentYear = now.getUTCFullYear();
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
  const [totals, quarters, missingReceiptCount, overdueInvoices, bookingCount, settings, unmatchedBankCount] = await Promise.all([
    getBookingTotals(year, getBookingPeriodRange(year, period, validPart)),
    Promise.all([1, 2, 3, 4].map((quarter) =>
      getBookingTotals(year, getBookingPeriodRange(year, "quarter", quarter)))),
    countMissingReceipts(year),
    db.accountingInvoice.findMany({
      where: { kind: "INVOICE", status: "ISSUED", dueDate: { lt: now } },
      select: { grossCents: true, paidCents: true, skontoCents: true },
    }),
    db.accountingBooking.count({
      where: {
        year, reversedAt: null, type: { not: "TRANSFER" },
        ...(getBookingPeriodRange(year, period, validPart)
          ? { bookingDate: {
            gte: getBookingPeriodRange(year, period, validPart)!.from,
            lt: getBookingPeriodRange(year, period, validPart)!.until,
          } } : {}),
      },
    }),
    getSettings(),
    db.accountingBankTransaction.count({ where: { status: "OPEN" } }),
  ]);

  const overdueOpen = summarizeOverdueInvoices(overdueInvoices);
  const maxBar = Math.max(1, ...quarters.flatMap((quarter) => [quarter.incomeCents, quarter.expenseCents]));
  const periodLink = (kind: Period, n = 1, y = year) =>
    `/muhasebe/panel?year=${y}&period=${kind}&part=${n}`;

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description", { year })}
        actions={<Link href="/muhasebe" className="text-sm font-medium text-accent hover:underline">{t("bookings")}</Link>}
      />

      <nav aria-label={t("filterLabel")} className="flex flex-wrap items-center gap-2">
        {[year - 1, year].filter((y) => y >= 2000).map((y) => (
          <Link key={y} href={periodLink(period, validPart, y)}
            className={`rounded-lg border px-3 py-2 text-sm ${y === year ? "border-accent text-accent" : "border-ink-200"}`}>
            {y}
          </Link>
        ))}
        <Link href={periodLink("year")} className="rounded-lg border border-ink-200 px-3 py-2 text-sm">{t("year")}</Link>
        {[1, 2, 3, 4].map((q) => (
          <Link key={q} href={periodLink("quarter", q)} className="rounded-lg border border-ink-200 px-3 py-2 text-sm">
            {t("quarter", { n: q })}
          </Link>
        ))}
        <span className="text-sm text-ink-500">{t("monthLabel")}</span>
        <div role="group" aria-label={t("monthLabel")} className="flex flex-wrap gap-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <Link key={month} href={periodLink("month", month)}
              aria-current={period === "month" && validPart === month ? "page" : undefined}
              className="rounded border border-ink-200 px-2 py-1 text-xs">{month}</Link>
          ))}
        </div>
      </nav>

      {bookingCount === 0 ? (
        <p className="rounded-lg border border-ink-200 p-4 text-sm text-ink-500">{t("noBookings")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: "income", value: totals.incomeCents },
            { key: "expense", value: totals.expenseCents },
            { key: "difference", value: totals.netCents },
          ].map((item) => (
            <article key={item.key} className="rounded-xl border border-ink-200 p-4">
              <h2 className="text-sm font-medium text-ink-500">{t(item.key)}</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(item.value)}</p>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-ink-200 p-4" aria-labelledby="accounting-quarters-title">
        <h2 id="accounting-quarters-title" className="mb-1 text-lg font-semibold">{t("quarterlyTitle")}</h2>
        <p className="mb-4 text-xs text-ink-500">{t("quarterlyDescription")}</p>
        <div className="space-y-3" aria-hidden="true">
          {quarters.map((q, i) => (
            <div key={i} className="grid grid-cols-[55px_minmax(0,1fr)] items-center gap-3">
              <span className="text-xs">{t("quarter", { n: i + 1 })}</span>
              <div className="space-y-1">
                <div className="h-2 rounded bg-ink-100"><div className="h-2 rounded bg-success-500" style={{ width: `${100 * q.incomeCents / maxBar}%` }} /></div>
                <div className="h-2 rounded bg-ink-100"><div className="h-2 rounded bg-danger-500" style={{ width: `${100 * q.expenseCents / maxBar}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">{t("quarterlyTitle")}</caption>
          <thead><tr><th scope="col" className="text-left">{t("periodColumn")}</th><th scope="col" className="text-right">{t("income")}</th><th scope="col" className="text-right">{t("expense")}</th></tr></thead>
          <tbody>{quarters.map((q, i) => (
            <tr key={i} className="border-t border-ink-100">
              <th scope="row" className="py-2 text-left font-normal">{t("quarter", { n: i + 1 })}</th>
              <td className="text-right tabular-nums">{formatMoney(q.incomeCents)}</td>
              <td className="text-right tabular-nums">{formatMoney(q.expenseCents)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <section aria-labelledby="accounting-recommendations" className="space-y-3">
        <h2 id="accounting-recommendations" className="text-lg font-semibold">{t("recommendations")}</h2>
        {missingReceiptCount > 0 ? (
          <p className="rounded-lg border border-warning-300 p-4 text-sm">
            {t("missingReceipts", { count: missingReceiptCount, year })}{" "}
            <Link href={`/muhasebe?filter.year=${year}&filter.missingReceipt=1`} className="font-medium underline">{t("inspectBookings")}</Link>
          </p>
        ) : null}
        {overdueOpen.count > 0 ? (
          <p className="rounded-lg border border-warning-300 p-4 text-sm">
            {t("overdue", { count: overdueOpen.count, amount: formatMoney(overdueOpen.cents) })}{" "}
            <Link href="/muhasebe/faturalar" className="font-medium underline">{t("inspectInvoices")}</Link>
          </p>
        ) : null}
        {unmatchedBankCount > 0 ? (
          <p className="rounded-lg border border-warning-300 p-4 text-sm">
            {t("unmatchedBank", { count: unmatchedBankCount })}{" "}
            <Link href="/muhasebe/banka?durum=open" className="font-medium underline">{t("inspectBank")}</Link>
          </p>
        ) : null}
        {missingReceiptCount === 0 && overdueOpen.count === 0 && unmatchedBankCount === 0 ? (
          <p className="text-sm text-ink-500">{t("noWarnings")}</p>
        ) : null}
      </section>
      <p className="text-xs text-ink-500">
        {t("basis")} {t("taxMethod", { method: settings.tax.taxMethod })}
      </p>
    </section>
  );
}
