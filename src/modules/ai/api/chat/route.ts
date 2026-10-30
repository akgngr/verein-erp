import { aiChatHandler } from "../../server";

export const runtime = "nodejs";

/** POST AI sohbet turu — ince sarmalayıcı; mantık handlers/chat.ts'te. */
export async function POST(request: Request): Promise<Response> {
  return aiChatHandler(request);
}
