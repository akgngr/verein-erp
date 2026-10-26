import { exportDocumentsHandler } from "@/modules/documents/server";

export const runtime = "nodejs";

/** GET Excel dışa aktarım — ince sarmalayıcı (10. bölüm): mantık handlers/export-documents.ts'te. */
export async function GET(request: Request): Promise<Response> {
  return exportDocumentsHandler(request);
}
