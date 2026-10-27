import { exportBookingsHandler } from "@/modules/accounting/server";

export const runtime = "nodejs";

/** GET fiş listesi Excel — ince sarmalayıcı (§ 11.9). */
export async function GET(request: Request): Promise<Response> {
  return exportBookingsHandler(request);
}
