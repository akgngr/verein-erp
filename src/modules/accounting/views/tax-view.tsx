import { AlertTriangle, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getDb } from "@/shared/db";
import { formatMoney } from "@/shared/money";

import { accountingPermissions } from "../permissions";
import { getSmallBusinessCheck, listTaxRows } from "../queries/tax-reports";
import { getEuerAdjustments } from "../queries/assets";
import { getTaxSettings } from "../services/tax";
import { computeEuer, computeUstva, datevIssues, SMALL_BUSINESS_LIMITS, vatPeriods, type EuerAdjustments, type TaxBookingRow, type UstvaKey } from "../services/tax-reports";

export type TaxTab = "ustva" | "euer" | "datev";

const iso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Vergi (ACC-2): UStVA Kennzahlen (drill-down), EÜR özeti ve DATEV EXTF dışa aktarımı.
 * Tek veri kaynağı: iptal edilmemiş fişler (brüt/net/KDV). Ist-Versteuerung: fiş tarihi.
 */
export async function TaxView({ tab, year, period }: { tab: TaxTab; year: number; period: string | null }) {
  try {
    await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("accounting.tax");
  const locale = (await getLocale()) === "de" ? "de-DE" : "tr-TR";
  const money = (cents: number) => formatMoney(cents, locale);
  const settings = await getTaxSettings(getDb());

  const periods = vatPeriods(year, settings.vatPeriod);
  const selected = periods.find((item) => item.key === period) ?? (tab === "ustva" ? periods[0] : { key: "J", from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31)) });
  const range = tab === "ustva" ? selected : { key: "J", from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31)) };
  const [rows, smallBusiness] = await Promise.all([listTaxRows(range.from, range.to), settings.smallBusiness ? getSmallBusinessCheck(year) : null]);

  const href = (next: Partial<{ tab: TaxTab; year: number; period: string }>) => {
    const params = new URLSearchParams({ sekme: next.tab ?? tab, yil: String(next.year ?? year) });
    const p = next.period ?? (next.year ? undefined : period ?? undefined);
    if (p) params.set("donem", p);
    return `/muhasebe/vergi?${params.toString()}`;
  };
  const pill = (active: boolean) => `rounded-medium px-3 py-1.5 ${active ? "bg-primary text-white" : "border border-default-200"}`;
  const periodLabel = (key: string) => (key === "J" ? t("periodYear") : key.startsWith("Q") ? t("periodQuarter", { q: key.slice(1) }) : t("periodMonth", { m: key }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("subtitle", { chart: settings.chartOfAccounts, method: settings.taxMethod === "IST" ? t("methodIST") : t("methodSOLL") })}
        actions={
          <div className="flex items-center gap-1">
            <LinkButton href={href({ year: year - 1 })} variant="light" aria-label={t("prevYear")} startIcon={<ChevronLeft className="h-4 w-4" />}>
              {String(year - 1)}
            </LinkButton>
            <span className="px-2 font-semibold">{year}</span>
            <LinkButton href={href({ year: year + 1 })} variant="light" aria-label={t("nextYear")} startIcon={<ChevronRight className="h-4 w-4" />}>
              {String(year + 1)}
            </LinkButton>
          </div>
        }
      />

      <nav className="flex flex-wrap gap-2 text-small">
        {(["ustva", "euer", "datev"] as const).map((key) => (
          <Link key={key} href={href({ tab: key })} className={pill(tab === key)}>
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>

      {smallBusiness && smallBusiness.status !== "ok" ? (
        <div className={`flex gap-2 rounded-medium border p-3 text-small ${smallBusiness.status === "lost" ? "border-danger-200 bg-danger-50 text-danger-700" : "border-warning-200 bg-warning-50 text-warning-700"}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t(`smallBusiness.${smallBusiness.status}`, {
              previous: money(smallBusiness.previousYearCents),
              current: money(smallBusiness.currentYearCents),
              limitPrevious: money(SMALL_BUSINESS_LIMITS.previousYearCents),
              limitCurrent: money(SMALL_BUSINESS_LIMITS.currentYearCents),
            })}
          </span>
        </div>
      ) : null}

      <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
        {tab === "ustva" ? (
          <UstvaSection rows={rows} periods={periods.map((item) => ({ key: item.key, label: periodLabel(item.key), href: href({ period: item.key }), active: item.key === selected.key }))} money={money} t={t} smallBusiness={settings.smallBusiness} />
        ) : null}
        {tab === "euer" ? <EuerSection rows={rows} money={money} t={t} adjustments={await getEuerAdjustments(year)} /> : null}
        {tab === "datev" ? (
          <DatevSection rows={rows} year={year} money={money} t={t} hasNumbers={Boolean(settings.datevConsultantNo && settings.datevClientNo)} periods={periods} periodLabel={periodLabel} />
        ) : null}
      </div>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"accounting.tax">>>;

function BookingList({ rows, money }: { rows: TaxBookingRow[]; money: (cents: number) => string }) {
  if (!rows.length) return null;
  return (
    <ul className="mt-2 flex flex-col divide-y divide-default-100 text-tiny">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap justify-between gap-2 py-1.5">
          <Link href={`/muhasebe/${row.id}`} className="text-primary underline-offset-2 hover:underline">
            {row.bookingNumber} · {iso(row.bookingDate)} · {row.description}
          </Link>
          <span className="tabular-nums text-default-600">
            {money(row.netCents)} + {money(row.taxCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function UstvaSection({
  rows,
  periods,
  money,
  t,
  smallBusiness,
}: {
  rows: TaxBookingRow[];
  periods: Array<{ key: string; label: string; href: string; active: boolean }>;
  money: (cents: number) => string;
  t: T;
  smallBusiness: boolean;
}) {
  const result = computeUstva(rows);
  const euros = (value: number) => money(value * 100);
  const lines: Array<{ kz: UstvaKey; label: string; base?: string; tax: string }> = [
    { kz: "81", label: t("ustva.kz81"), base: euros(result.kz81BaseEuros), tax: money(result.kz81TaxCents) },
    { kz: "86", label: t("ustva.kz86"), base: euros(result.kz86BaseEuros), tax: money(result.kz86TaxCents) },
    { kz: "66", label: t("ustva.kz66"), tax: money(result.kz66Cents) },
  ];
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1.5 text-tiny">
        {periods.map((item) => (
          <Link key={item.key} href={item.href} className={`rounded-small px-2 py-1 ${item.active ? "bg-primary text-white" : "border border-default-200"}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      {smallBusiness ? <p className="text-small text-default-500">{t("ustva.smallBusiness")}</p> : null}
      <table className="w-full text-small">
        <thead>
          <tr className="border-b border-default-200 text-left text-tiny uppercase text-default-500">
            <th className="py-2">{t("ustva.kz")}</th>
            <th className="py-2">{t("ustva.label")}</th>
            <th className="py-2 text-right">{t("ustva.base")}</th>
            <th className="py-2 text-right">{t("ustva.tax")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.kz} className="border-b border-default-100 align-top">
              <td className="py-2 font-mono font-semibold">{line.kz}</td>
              <td className="py-2">
                <details>
                  <summary className="cursor-pointer">
                    {line.label} <span className="text-tiny text-default-400">({t("ustva.count", { count: result.rows[line.kz].length })})</span>
                  </summary>
                  <BookingList rows={result.rows[line.kz]} money={money} />
                </details>
              </td>
              <td className="py-2 text-right tabular-nums">{line.base ?? "—"}</td>
              <td className="py-2 text-right tabular-nums">{line.tax}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2 font-mono">83</td>
            <td className="py-2">{result.kz83Cents >= 0 ? t("ustva.kz83Pay") : t("ustva.kz83Refund")}</td>
            <td />
            <td className={`py-2 text-right tabular-nums ${result.kz83Cents >= 0 ? "text-danger" : "text-success"}`}>{money(result.kz83Cents)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-tiny text-default-500">{t("ustva.note", { booked: money(result.bookedOutputTaxCents) })}</p>
    </div>
  );
}

function EuerSection({ rows, money, t, adjustments }: { rows: TaxBookingRow[]; money: (cents: number) => string; t: T; adjustments: EuerAdjustments }) {
  const result = computeEuer(rows, adjustments);
  // Nakit dışı satırlar (AfA, götürüler) çevrilmiş adla gösterilir.
  for (const line of result.expense) if (line.categoryId?.startsWith("noncash:")) line.name = t(`euer.noncash.${line.name}`);
  const block = (title: string, lines: typeof result.income, taxLabel: string, taxCents: number, totalCents: number) => (
    <section className="flex flex-col gap-1">
      <h3 className="text-small font-semibold uppercase tracking-wide text-default-500">{title}</h3>
      <table className="w-full text-small">
        <tbody>
          {lines.map((line) => (
            <tr key={line.categoryId ?? "-"} className="border-b border-default-100">
              <td className="w-20 py-1.5 font-mono text-default-500">{line.accountNumber ?? "—"}</td>
              <td className="py-1.5">{line.name}</td>
              <td className="py-1.5 text-right tabular-nums">{money(line.netCents)}</td>
            </tr>
          ))}
          <tr className="border-b border-default-100 text-default-600">
            <td />
            <td className="py-1.5">{taxLabel}</td>
            <td className="py-1.5 text-right tabular-nums">{money(taxCents)}</td>
          </tr>
          <tr className="font-semibold">
            <td />
            <td className="py-1.5">{t("euer.total")}</td>
            <td className="py-1.5 text-right tabular-nums">{money(totalCents)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
  return (
    <div className="flex flex-col gap-6">
      {block(t("euer.income"), result.income, t("euer.outputTax"), result.outputTaxCents, result.incomeNetCents + result.outputTaxCents)}
      {block(t("euer.expense"), result.expense, t("euer.inputTax"), result.inputTaxCents, result.expenseNetCents + result.inputTaxCents)}
      <p className={`text-medium font-semibold ${result.resultCents >= 0 ? "text-success" : "text-danger"}`}>
        {result.resultCents >= 0 ? t("euer.profit") : t("euer.loss")}: {money(result.resultCents)}
      </p>
      <p className="text-tiny text-default-500">{t("euer.note")}</p>
    </div>
  );
}

function DatevSection({
  rows,
  year,
  money,
  t,
  hasNumbers,
  periods,
  periodLabel,
}: {
  rows: TaxBookingRow[];
  year: number;
  money: (cents: number) => string;
  t: T;
  hasNumbers: boolean;
  periods: Array<{ key: string; from: Date; to: Date }>;
  periodLabel: (key: string) => string;
}) {
  const issues = datevIssues(rows);
  const total = rows.reduce((sum, row) => sum + row.amountCents, 0);
  const download = (from: Date, to: Date) => `/api/accounting/datev?kind=bookings&from=${iso(from)}&to=${iso(to)}`;
  const ready = hasNumbers && issues.length === 0;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-default-600">{t("datev.intro")}</p>
      {!hasNumbers ? (
        <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">
          {t("datev.numbersMissing")}{" "}
          <Link href="/muhasebe/ayarlar" className="font-medium underline">
            {t("datev.toSettings")}
          </Link>
        </p>
      ) : null}
      {issues.length ? (
        <div className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">
          <p className="font-medium">{t("datev.issues", { count: issues.length })}</p>
          <ul className="mt-1 list-disc pl-5 text-tiny">
            {issues.slice(0, 20).map((issue) => (
              <li key={issue.id}>
                <Link href={`/muhasebe/${issue.id}`} className="underline">
                  {issue.bookingNumber}
                </Link>{" "}
                — {t(`datev.reason.${issue.reason}`)}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-tiny">{t("datev.issuesHint")}</p>
        </div>
      ) : null}
      <p className="text-small">{t("datev.summary", { count: rows.length, total: money(total), year })}</p>
      <div className="flex flex-wrap gap-2">
        {ready ? (
          <>
            <DownloadLink href={download(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31)))} primary>
              {t("datev.downloadYear", { year })}
            </DownloadLink>
            {periods.length > 1
              ? periods.map((item) => (
                  <DownloadLink key={item.key} href={download(item.from, item.to)}>
                    {periodLabel(item.key)}
                  </DownloadLink>
                ))
              : null}
          </>
        ) : null}
        {hasNumbers ? (
          <DownloadLink href={`/api/accounting/datev?kind=accounts&from=${year}-01-01&to=${year}-12-31`}>
            {t("datev.downloadAccounts")}
          </DownloadLink>
        ) : null}
      </div>
      <ul className="list-disc pl-5 text-tiny text-default-500">
        <li>{t("datev.noteGross")}</li>
        <li>{t("datev.noteReversed")}</li>
      </ul>
    </div>
  );
}

/** API indirmesi: düz <a download> (Next Link istemci yönlendirmesi/prefetch yapmasın). */
function DownloadLink({ href, primary = false, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      download
      className={`inline-flex items-center gap-1.5 rounded-medium px-3 py-2 text-small font-medium ${primary ? "bg-primary text-primary-foreground" : "border border-default-300 hover:bg-default-100"}`}
    >
      <Download className="h-4 w-4" aria-hidden />
      {children}
    </a>
  );
}
