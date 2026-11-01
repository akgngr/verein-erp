import { paymentRunHandler } from "../../server";

export const runtime = "nodejs";

/** GET SEPA ödeme listesi (pain.001) — ince sarmalayıcı (ACC-6). */
export async function GET(request: Request): Promise<Response> {
  return paymentRunHandler(request);
}
