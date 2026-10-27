import { downloadMeetingFileHandler } from "@/modules/meetings/server";

export const runtime = "nodejs";

/** GET indirme/önizleme — ince sarmalayıcı (8. bölüm): mantık handlers/download-file.ts'te. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  const { fileId } = await params;
  return downloadMeetingFileHandler(request, { fileId });
}
