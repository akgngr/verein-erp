import { documentSummaryHandler } from "../../server";

export const runtime = "nodejs";

/** POST evrak özeti ve sınıflandırma (EV-2) — ince sarmalayıcı; mantık handlers/document-summary.ts'te. */
export async function POST(request: Request): Promise<Response> {
  return documentSummaryHandler(request);
}
