import { uploadPayableHandler } from "../../server";

export const runtime = "nodejs";

/** POST gelen fatura belgesi yükle (ACC-5) — ince sarmalayıcı. */
export async function POST(request: Request): Promise<Response> {
  return uploadPayableHandler(request);
}
