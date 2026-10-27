import "server-only";

import { buildLedgerReport } from "../services/report-builders";

/** Kasa defteri (§ 11.8 md. 2) — hesaplayıcı servise delege eder. */
export function getLedgerReport(accountId: string, from: string, to: string) {
  return buildLedgerReport(accountId, from, to);
}
