import { exportIncomeExpenseHandler } from "@/modules/accounting/server";

export const runtime = "nodejs";

/** GET gelir-gider tablosu Excel — ince sarmalayıcı (§ 11.8 md. 1). */
export async function GET(request: Request): Promise<Response> {
  return exportIncomeExpenseHandler(request);
}
