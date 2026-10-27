import { exportMinutesPdfHandler } from "@/modules/meetings/server";

export const runtime = "nodejs";

/** GET tutanak PDF — ince sarmalayıcı (9. bölüm): mantık handlers/export-minutes-pdf.tsx'te. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return exportMinutesPdfHandler(request, { id });
}
