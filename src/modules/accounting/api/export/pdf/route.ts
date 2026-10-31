import { bookingListPdfHandler } from "../../../server";

export const runtime = "nodejs";

/** GET gelir/gider listesi PDF — ince sarmalayıcı. */
export async function GET(request: Request): Promise<Response> {
  return bookingListPdfHandler(request);
}
