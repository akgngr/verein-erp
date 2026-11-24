import { handlePortalReceiptDownloadGet } from "@/modules/member-portal/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  return handlePortalReceiptDownloadGet(request, { ref });
}
