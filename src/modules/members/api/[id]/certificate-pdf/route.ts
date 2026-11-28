import { exportMemberCertificatePdfHandler } from "@/modules/members/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return exportMemberCertificatePdfHandler(request, { id });
}
