import "server-only";

import { extractTextFromBytes } from "@/shared/files/extract-text";

import { extractDocumentFields, type DocumentSuggestions } from "./field-extraction";
import { ocrImage, ocrScannedPdf } from "./ocr";

export type DocumentAnalysis = {
  source: "text" | "ocr" | "none";
  /** OCR güveni (0–100); metin katmanında null. */
  confidence: number | null;
  /** Kullanıcıya önizleme için kısaltılmış metin (yalnız istek yanıtında; saklanmaz, loglanmaz). */
  preview: string;
  suggestions: DocumentSuggestions;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp", "image/gif"]);
const PREVIEW_CHARS = 4000;

/**
 * Evrak dosyasını analiz eder (docs/specs/DOCUMENTS_AI.md, EV-1): önce metin katmanı (PDF/Word/Excel/metin),
 * yoksa OCR (görüntü veya taranmış PDF), ardından kural tabanlı form önerileri. Hiçbir şey saklanmaz.
 */
export async function analyzeDocumentBytes(bytes: Uint8Array, mimeType: string): Promise<DocumentAnalysis> {
  let text = "";
  let source: DocumentAnalysis["source"] = "none";
  let confidence: number | null = null;
  if (IMAGE_TYPES.has(mimeType)) {
    const ocr = await ocrImage(bytes);
    [text, source, confidence] = [ocr.text, "ocr", ocr.confidence];
  } else {
    const extracted = await extractTextFromBytes(bytes, mimeType);
    if (extracted.text && extracted.text.replace(/\s/g, "").length >= 20) {
      [text, source] = [extracted.text, "text"];
    } else if (mimeType === "application/pdf") {
      const ocr = await ocrScannedPdf(bytes);
      if (ocr.pages) [text, source, confidence] = [ocr.text, "ocr", ocr.confidence];
    }
  }
  return { source: text.trim() ? source : "none", confidence, preview: text.slice(0, PREVIEW_CHARS), suggestions: extractDocumentFields(text) };
}
