import { annualReportPdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET Kassenbericht PDF — ince sarmalayıcı (§ 11.8 md. 4). */
export async function GET(request: Request): Promise<Response> {
  return annualReportPdfHandler(request);
}
