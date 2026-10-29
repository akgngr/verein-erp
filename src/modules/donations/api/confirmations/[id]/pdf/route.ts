import { downloadConfirmationPdfHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET depolanmış bildirim PDF'i — ince sarmalayıcı (§ 13). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return downloadConfirmationPdfHandler(request, { id });
}
