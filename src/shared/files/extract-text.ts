import "server-only";

import { readFile } from "node:fs/promises";

import { resolveSafePath } from "./storage";

/** Modele gönderilecek en fazla karakter (uzun belgeler kısaltılır ve bu belirtilir). */
export const MAX_EXTRACTED_CHARS = 30_000;

export type ExtractedText = { text: string | null; truncated: boolean; reason?: "unsupported" | "empty" | "failed" };

/**
 * Yüklenmiş dosyadan düz metin çıkarır: PDF (metin katmanı), Word (.docx) ve Excel (.xlsx).
 * Taranmış PDF'ler ve resimler için metin yoktur (OCR yapılmaz) — "empty"/"unsupported" döner.
 */
export async function extractTextFromBytes(data: Uint8Array, mimeType: string): Promise<ExtractedText> {
  try {
    let text = "";
    if (mimeType === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(data));
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(data) })).value;
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(data) as unknown as ArrayBuffer);
      const lines: string[] = [];
      workbook.eachSheet((sheet) => {
        lines.push(`# ${sheet.name}`);
        sheet.eachRow((row) => {
          const values = (row.values as unknown[]).slice(1).map((value) => (value && typeof value === "object" && "text" in value ? String((value as { text: unknown }).text) : value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "")));
          lines.push(values.join(" | "));
        });
      });
      text = lines.join("\n");
    } else if (mimeType.startsWith("text/")) {
      text = Buffer.from(data).toString("utf8");
    } else {
      return { text: null, truncated: false, reason: "unsupported" };
    }
    const normalized = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!normalized) return { text: null, truncated: false, reason: "empty" };
    return { text: normalized.slice(0, MAX_EXTRACTED_CHARS), truncated: normalized.length > MAX_EXTRACTED_CHARS };
  } catch (error) {
    console.error("[shared/files] Metin çıkarılamadı:", (error as Error).message);
    return { text: null, truncated: false, reason: "failed" };
  }
}

export async function extractTextFromStoredFile(storagePath: string, mimeType: string): Promise<ExtractedText> {
  return extractTextFromBytes(await readFile(resolveSafePath(storagePath)), mimeType);
}
