import { exportInvitationPdfHandler } from "../../../server";

export const runtime = "nodejs";

/** GET toplantı davetiyesi & gündem PDF — ince sarmalayıcı. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return exportInvitationPdfHandler(request, { id });
}
