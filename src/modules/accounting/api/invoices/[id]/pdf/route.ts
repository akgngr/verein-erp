import { invoicePdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET fatura / proforma PDF — ince sarmalayıcı. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return invoicePdfHandler(request, (await params).id);
}
