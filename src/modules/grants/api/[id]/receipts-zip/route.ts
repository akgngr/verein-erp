import { exportReceiptsZipHandler } from "@/modules/grants/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return exportReceiptsZipHandler(request, { id });
}
