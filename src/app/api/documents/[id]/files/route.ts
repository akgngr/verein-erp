import { uploadFileHandler } from "@/modules/documents/server";

export const runtime = "nodejs";

/** POST yükleme — ince sarmalayıcı (7. bölüm): mantık handlers/upload-file.ts'te. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return uploadFileHandler(request, { id });
}
