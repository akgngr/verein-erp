import { exportDatevHandler } from "../../server";

export const runtime = "nodejs";

/** GET DATEV EXTF (Buchungsstapel / Kontenbeschriftungen) — ince sarmalayıcı (ACC-2). */
export async function GET(request: Request): Promise<Response> {
  return exportDatevHandler(request);
}
