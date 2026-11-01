import { createFeedbackHandler } from "../../server";

export const runtime = "nodejs";

/** POST hata/öneri kaydı — ince sarmalayıcı. */
export async function POST(request: Request): Promise<Response> {
  return createFeedbackHandler(request);
}
