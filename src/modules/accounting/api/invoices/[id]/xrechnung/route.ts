import { xrechnungHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET XRechnung (UBL) — ince sarmalayıcı (ACC-5). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return xrechnungHandler(request, (await params).id);
}
