import { financeInsightHandler } from "../../server";

export const runtime = "nodejs";

/** POST muhasebe durum analizi — ince sarmalayıcı; mantık handlers/finance-insight.ts'te. */
export async function POST(request: Request): Promise<Response> {
  return financeInsightHandler(request);
}
