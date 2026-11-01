import { downloadPayableFileHandler } from "../../../../server";

export const runtime = "nodejs";

/** GET gelen fatura belgesi (ACC-5) — ince sarmalayıcı. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return downloadPayableFileHandler(request, (await params).id);
}
