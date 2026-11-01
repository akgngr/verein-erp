import { gobdExportHandler } from "../../../server";

export const runtime = "nodejs";

/** GET GDPdU/Z3 ZIP — ince sarmalayıcı (ACC-7). */
export async function GET(request: Request): Promise<Response> {
  return gobdExportHandler(request);
}
