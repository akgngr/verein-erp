import type { TreasurerReportResult } from "../services/treasurer-report";
import { ACCOUNTING_STRINGS, type AccountingLanguage } from "../pdf/strings";

export interface TreasurerReportSummaryOutput {
  lines: string[];
  recommendation: string | null;
}

/**
 * Formats treasurer report narrative summary using the UI translation function (ICU format).
 */
export function getTreasurerReportSummary(
  report: TreasurerReportResult,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatMoney: (cents: number) => string
): TreasurerReportSummaryOutput {
  const lines: string[] = [];

  // 1. Income / Expense balance
  if (report.totals.netAnnualSurplusCents >= 0) {
    lines.push(
      t("summary.incomeSurplus", {
        year: report.year,
        income: formatMoney(report.totals.totalIncomeCents),
        expense: formatMoney(report.totals.totalExpenseCents),
        surplus: formatMoney(report.totals.netAnnualSurplusCents),
      })
    );
  } else {
    lines.push(
      t("summary.incomeDeficit", {
        year: report.year,
        income: formatMoney(report.totals.totalIncomeCents),
        expense: formatMoney(report.totals.totalExpenseCents),
        deficit: formatMoney(Math.abs(report.totals.netAnnualSurplusCents)),
      })
    );
  }

  // 2. Ideell sphere
  const ideellNetCents = report.spheres.find((s) => s.sphere === "IDEELL")?.netCents ?? 0;
  lines.push(
    t("summary.ideell", {
      net: formatMoney(ideellNetCents),
    })
  );

  // 3. Projects
  if (report.projects.length > 0) {
    lines.push(
      t("summary.projectsWithCount", {
        count: report.projects.length,
        earmarked: formatMoney(report.reserves.earmarkedFundsCents),
      })
    );
  } else {
    lines.push(t("summary.projectsNone"));
  }

  // 4. Liquid reserves
  lines.push(
    t("summary.reserves", {
      closing: formatMoney(report.reserves.closingReservesCents),
      free: formatMoney(report.reserves.freeReservesCents),
    })
  );

  // 5. Recorded reserves (§ 62 AO)
  if (report.reserves.recordedReserves.length > 0) {
    const totalRecordedCents = report.reserves.recordedReserves.reduce(
      (sum, r) => sum + r.amountCents,
      0
    );
    lines.push(
      t("summary.recordedReserves", {
        recorded: formatMoney(totalRecordedCents),
      })
    );
  }

  // Recommendation
  const recommendation = t("summary.recommendation", { year: report.year });

  return { lines, recommendation };
}

/**
 * Formats treasurer report narrative summary using static PDF/report strings.
 */
export function getTreasurerReportSummaryFromStrings(
  report: TreasurerReportResult,
  lang: AccountingLanguage,
  formatMoney: (cents: number) => string
): TreasurerReportSummaryOutput {
  const strings = ACCOUNTING_STRINGS[lang].treasurerReport;
  const lines: string[] = [];

  // 1. Income / Expense balance
  if (report.totals.netAnnualSurplusCents >= 0) {
    lines.push(
      strings.summaryIncomeSurplus(
        report.year,
        formatMoney(report.totals.totalIncomeCents),
        formatMoney(report.totals.totalExpenseCents),
        formatMoney(report.totals.netAnnualSurplusCents)
      )
    );
  } else {
    lines.push(
      strings.summaryIncomeDeficit(
        report.year,
        formatMoney(report.totals.totalIncomeCents),
        formatMoney(report.totals.totalExpenseCents),
        formatMoney(Math.abs(report.totals.netAnnualSurplusCents))
      )
    );
  }

  // 2. Ideell sphere
  const ideellNetCents = report.spheres.find((s) => s.sphere === "IDEELL")?.netCents ?? 0;
  lines.push(strings.summaryIdeell(formatMoney(ideellNetCents)));

  // 3. Projects
  if (report.projects.length > 0) {
    lines.push(
      strings.summaryProjects(
        report.projects.length,
        formatMoney(report.reserves.earmarkedFundsCents)
      )
    );
  } else {
    lines.push(strings.summaryNoProjects);
  }

  // 4. Liquid reserves
  lines.push(
    strings.summaryReserves(
      formatMoney(report.reserves.closingReservesCents),
      formatMoney(report.reserves.freeReservesCents)
    )
  );

  // 5. Recorded reserves (§ 62 AO)
  if (report.reserves.recordedReserves.length > 0) {
    const totalRecordedCents = report.reserves.recordedReserves.reduce(
      (sum, r) => sum + r.amountCents,
      0
    );
    lines.push(strings.summaryRecordedReserves(formatMoney(totalRecordedCents)));
  }

  const recommendation = strings.recommendation(report.year);

  return { lines, recommendation };
}
