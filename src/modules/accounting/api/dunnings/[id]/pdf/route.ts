import { dunningPdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET ihtar mektubu PDF — ince sarmalayıcı (ACC-6). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return dunningPdfHandler(request, (await params).id);
}
