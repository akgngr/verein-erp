import { treasurerReportPdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET Genel Kurul Kassenbericht PDF — ince sarmalayıcı (Q3). */
export async function GET(request: Request): Promise<Response> {
  return treasurerReportPdfHandler(request);
}
