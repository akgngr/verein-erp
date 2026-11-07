import { grantReportPdfHandler } from "../../../server";

export const runtime = "nodejs";

/** GET Verwendungsnachweis PDF — ince sarmalayıcı; mantık handlers/report-pdf.tsx'te. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return grantReportPdfHandler(request, { id });
}
