import { exportMemberDataHandler } from "@/modules/members/server";

export const runtime = "nodejs";

/** GET DSGVO Art. 15 veri dışa aktarması — ince sarmalayıcı (4.6). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return exportMemberDataHandler(request, { id });
}
