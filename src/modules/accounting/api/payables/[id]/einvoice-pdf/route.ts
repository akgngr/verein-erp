import { payableEInvoicePdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET gelen e-faturanın okunabilir PDF'i (EI-3) — ince sarmalayıcı. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return payableEInvoicePdfHandler((await params).id);
}
