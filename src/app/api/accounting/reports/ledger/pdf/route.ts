import { ledgerPdfHandler } from "@/modules/accounting/server";

export const runtime = "nodejs";

/** GET kasa defteri PDF — ince sarmalayıcı (§ 11.8 md. 2). */
export async function GET(request: Request): Promise<Response> {
  return ledgerPdfHandler(request);
}
