import { batchPdfHandler } from "@/modules/donations/server";

export const runtime = "nodejs";

/** GET toplu yazdırma PDF'i — ince sarmalayıcı (§ 13). */
export async function GET(request: Request): Promise<Response> {
  return batchPdfHandler(request);
}
