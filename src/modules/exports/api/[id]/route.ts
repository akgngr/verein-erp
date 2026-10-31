import { downloadGeneratedFileHandler } from "../../services/download-handler";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  return downloadGeneratedFileHandler(id);
}
