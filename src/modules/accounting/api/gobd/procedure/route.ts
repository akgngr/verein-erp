import { gobdProcedureHandler } from "../../../server";

export const runtime = "nodejs";

/** GET Verfahrensdokumentation (Markdown) — ince sarmalayıcı (ACC-7). */
export async function GET(): Promise<Response> {
  return gobdProcedureHandler();
}
