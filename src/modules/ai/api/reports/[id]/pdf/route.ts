import { aiReportPdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET asistan raporu PDF — ince sarmalayıcı. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return aiReportPdfHandler(request, (await params).id);
}
