import { templatePreviewPdfHandler } from "@/modules/donations/server";

export const runtime = "nodejs";

/** GET şablon önizleme PDF'i — ince sarmalayıcı (§ 13). */
export async function GET(request: Request): Promise<Response> {
  return templatePreviewPdfHandler(request);
}
