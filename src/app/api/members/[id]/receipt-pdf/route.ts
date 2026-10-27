import { exportReceiptPdfHandler } from "@/modules/members/server";

export const runtime = "nodejs";

/** GET aidat makbuzu PDF — ince sarmalayıcı (4.3/4.6); mantık handlers/receipt-pdf.tsx'te. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return exportReceiptPdfHandler(request, { id });
}
