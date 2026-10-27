import { exportDonationsHandler } from "@/modules/donations/server";

export const runtime = "nodejs";

/** GET bağış listesi Excel — ince sarmalayıcı (§ 15 md. 9). */
export async function GET(request: Request): Promise<Response> {
  return exportDonationsHandler(request);
}
