import { aiAttachmentHandler } from "../../server";

export const runtime = "nodejs";

/** POST sohbet eki: dosyadan metin çıkarır, şifreli mühür döner — ince sarmalayıcı; mantık handlers/attachments.ts'te. */
export async function POST(request: Request): Promise<Response> {
  return aiAttachmentHandler(request);
}
