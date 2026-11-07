import { evidencePdfHandler } from "../../../server";

export const runtime = "nodejs";

/** GET imzalı form PDF'i — ince sarmalayıcı; mantık handlers/evidence-pdf.tsx'te. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return evidencePdfHandler(request, { id });
}
