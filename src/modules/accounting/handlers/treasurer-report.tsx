import "server-only";

import { treasurerReportPdfHandler } from "./treasurer-report-pdf";

/**
 * Genel Kurul Kassenbericht PDF indirme handler'ı (Q3).
 * Doğrudan sertleştirilmiş `treasurerReportPdfHandler`'a devreder.
 */
export async function treasurerReportHandler(request: Request): Promise<Response> {
  return treasurerReportPdfHandler(request);
}
