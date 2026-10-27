import "server-only";

import { buildAnnualReportData, buildIncomeExpenseReport } from "../services/report-builders";

/** Gelir-Gider tablosu (§ 11.8 md. 1) + Kassenbericht verisi (md. 4). */
export function getIncomeExpenseReport(year: number) {
  return buildIncomeExpenseReport(year);
}
export function getAnnualReportData(year: number) {
  return buildAnnualReportData(year);
}
