import { bookingVoucherPdfHandler } from "../../../server";

export const runtime = "nodejs";

/** GET fiş belgesi PDF (Quittung / Auszahlungsbeleg / Umbuchungsbeleg) — ince sarmalayıcı. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return bookingVoucherPdfHandler(request, (await params).id);
}
