import "server-only";

import { extractTextFromBytes, MAX_EXTRACTED_CHARS } from "./extract-text";
import { ocrImage, ocrScannedPdf } from "./ocr";

export type AttachmentText = { text: string; source: "text" | "ocr"; truncated: boolean } | { text: null; reason: "unsupported" | "empty" | "failed" };

/** Bu sayının altında metin katmanı olan PDF "seyrek" sayılır ve görüntüleri de okunur. */
const SPARSE_PDF_TEXT_CHARS = 1500;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const TEXT_TYPES: Record<string, string> = { md: "text/markdown", markdown: "text/markdown", csv: "text/csv", txt: "text/plain" };

/**
 * Sohbet eki için düz metin: metin katmanı (PDF, Word, Excel, Markdown, CSV, TXT); yoksa OCR (resim, taranmış PDF).
 * Hiçbir şey saklanmaz, loglanmaz. Görsel modele gönderilmez; yalnız çıkarılan metin kullanılır.
 */
export async function extractAttachmentText(bytes: Uint8Array, mimeType: string, extension: string): Promise<AttachmentText> {
  try {
    const mime = TEXT_TYPES[extension] ?? mimeType;
    if (IMAGE_TYPES.has(mime)) {
      const ocr = await ocrImage(bytes);
      return clip(ocr.text, "ocr");
    }
    const extracted = await extractTextFromBytes(bytes, mime);
    const textChars = extracted.text?.replace(/\s/g, "").length ?? 0;
    // PDF'de metin katmanı azsa (el ilanı, taranmış sayfa üstünde başlık vb.) gömülü görüntüler de OCR'lanır ve birleştirilir.
    if (mime === "application/pdf" && textChars < SPARSE_PDF_TEXT_CHARS) {
      const ocr = await ocrScannedPdf(bytes);
      if (ocr.pages && ocr.text.trim()) return clip([extracted.text ?? "", ocr.text].filter(Boolean).join("\n\n"), "ocr");
    }
    if (extracted.text && textChars >= 20) return { text: extracted.text, source: "text", truncated: extracted.truncated };
    if (extracted.text) return { text: extracted.text, source: "text", truncated: extracted.truncated };
    return { text: null, reason: extracted.reason === "unsupported" ? "unsupported" : extracted.reason === "failed" ? "failed" : "empty" };
  } catch {
    console.error("[shared/files] ATTACHMENT_TEXT_FAILED");
    return { text: null, reason: "failed" };
  }
}

function clip(raw: string, source: "text" | "ocr"): AttachmentText {
  const text = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return { text: null, reason: "empty" };
  return { text: text.slice(0, MAX_EXTRACTED_CHARS), source, truncated: text.length > MAX_EXTRACTED_CHARS };
}
