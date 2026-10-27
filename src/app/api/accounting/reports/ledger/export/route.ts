import { exportLedgerHandler } from "@/modules/accounting/server";

export const runtime = "nodejs";

/** GET kasa defteri Excel — ince sarmalayıcı (§ 11.8 md. 2). */
export async function GET(request: Request): Promise<Response> {
  return exportLedgerHandler(request);
}
