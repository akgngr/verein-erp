import { analyzeFileHandler } from "../../server";

export const runtime = "nodejs";
// OCR birkaç saniye sürebilir (en çok 5 sayfa).
export const maxDuration = 120;

/** POST evrak dosyasını kaydetmeden analiz eder — ince sarmalayıcı (handlers/analyze-file.ts). */
export async function POST(request: Request): Promise<Response> {
  return analyzeFileHandler(request);
}
