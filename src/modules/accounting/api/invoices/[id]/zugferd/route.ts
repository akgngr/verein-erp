import { zugferdHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET ZUGFeRD / Factur-X PDF — ince sarmalayıcı (ACC-5b). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return zugferdHandler(request, (await params).id);
}
