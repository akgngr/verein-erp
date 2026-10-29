import { uploadBookingFileHandler } from "../../../server";

export const runtime = "nodejs";

/** POST fiş belgesi yükleme — ince sarmalayıcı (§ 9); mantık handlers/upload-file.ts'te. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return uploadBookingFileHandler(request, { id });
}
