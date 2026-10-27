import "server-only";

import { buildProjectReport } from "../services/report-builders";

/** Proje raporu (§ 11.8 md. 3). */
export function getProjectReport(year: number) {
  return buildProjectReport(year);
}
