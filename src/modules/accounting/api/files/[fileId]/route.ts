import { downloadBookingFileHandler } from "../../../server";

export const runtime = "nodejs";

/** GET fiş belgesi indirme/önizleme — ince sarmalayıcı (§ 9). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  const { fileId } = await params;
  return downloadBookingFileHandler(request, { fileId });
}
