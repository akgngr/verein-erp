import "server-only";

import { extractTextFromBytes } from "@/shared/files/extract-text";

import { extractDocumentFields, type DocumentSuggestions } from "./field-extraction";
import { ocrImage, ocrScannedPdf } from "@/shared/files/ocr";

export type DocumentAnalysis = {
  source: "text" | "ocr" | "none";
  /** OCR güveni (0–100); metin katmanında null. */
  confidence: number | null;
  /** Kullanıcıya önizleme için kısaltılmış metin (yalnız istek yanıtında; saklanmaz, loglanmaz). */
  preview: string;
  suggestions: DocumentSuggestions;
  /**
   * S5.1 (#315): alan başına kaynak ve güven. `line`: değerin metinde bulunduğu satır (1'den; bulunamazsa null).
   * Değerler yalnız öneridir; kullanıcı doğrulamadan forma yazılmaz, hiçbir şey otomatik kaydedilmez.
   */
  provenance: Partial<Record<keyof DocumentSuggestions, { source: "text" | "ocr"; confidence: number | null; line: number | null }>>;
  /** OCR güveni eşiğin altında: arayüz her alanı ayrıca doğrulatmalı. */
  lowConfidence: boolean;
};

/** Bu güvenin (0–100) altındaki OCR sonuçları "düşük güven" sayılır. */
export const OCR_CONFIDENCE_THRESHOLD = 70;

/** Değerin metindeki ilk satırı (ham değer aranır; tarih/tutar gibi normalleştirilmiş alanlarda null). */
export function provenanceOf(text: string, suggestions: DocumentSuggestions, source: "text" | "ocr", confidence: number | null): DocumentAnalysis["provenance"] {
  const lines = text.split(/\r?\n/);
  const lineOf = (value: string) => {
    const needle = value.replace(/\s+/g, "").toLowerCase();
    if (needle.length < 3) return null;
    const index = lines.findIndex((line) => line.replace(/\s+/g, "").toLowerCase().includes(needle));
    return index >= 0 ? index + 1 : null;
  };
  const out: DocumentAnalysis["provenance"] = {};
  for (const [key, value] of Object.entries(suggestions) as [keyof DocumentSuggestions, unknown][]) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = { source, confidence, line: typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value) && key !== "kind" ? lineOf(value) : null };
  }
  return out;
}

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
  const suggestions = extractDocumentFields(text);
  const effective = text.trim() ? source : "none";
  return {
    source: effective,
    confidence,
    preview: text.slice(0, PREVIEW_CHARS),
    suggestions,
    provenance: effective === "none" ? {} : provenanceOf(text, suggestions, effective, confidence),
    lowConfidence: effective === "ocr" && (confidence ?? 0) < OCR_CONFIDENCE_THRESHOLD,
  };
}
