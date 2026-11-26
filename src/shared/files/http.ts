import "server-only";

import { getMessageTranslator } from "@/shared/i18n/translate-message";

import { INLINE_PREVIEW_EXTENSIONS } from "./file-types";
import { getExtension, type FileValidationResult } from "./validation";

/**
 * HTTP yardımcıları (Faz 2, 8. bölüm): multipart yükleme ayrıştırma ve
 * Faz 1 başlık kurallarını birebir uygulayan indirme yanıtı.
 */

export type ParsedUpload =
  | {
      ok: true;
      file: {
        originalName: string;
        declaredMime: string;
        size: number;
        head: Uint8Array;
        buffer: Buffer;
      };
      /** Dosya dışındaki metin alanları (ör. ön doldurma JSON'u); her biri en çok 4 KB. */
      fields: Record<string, string>;
    }
  | { ok: false; status: 400; error: string };

/** validateUpload hatasını isteğin dilinde kullanıcı mesajına çevirir. */
export async function uploadErrorMessage(
  result: Extract<FileValidationResult, { ok: false }>,
): Promise<string> {
  const translate = await getMessageTranslator();
  return translate(result.error, result.values);
}

/** multipart/form-data içindeki "file" alanını okur; hata durumunda JSON mesaj döner. */
export async function parseSingleFileUpload(request: Request): Promise<ParsedUpload> {
  const translate = await getMessageTranslator();
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      ok: false,
      status: 400,
      error: translate("files.readFailed"),
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, status: 400, error: translate("files.missing") };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // head: imza (magic bytes) denetimi için ilk 64 KB — validateUpload'ın
  // en uzun imzası bu pencerede kalır.
  const head = new Uint8Array(buffer.subarray(0, 65_536));
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "file" && typeof value === "string" && value.length <= 4096) fields[key] = value;
  }
  return {
    ok: true,
    fields,
    file: {
      originalName: file.name,
      declaredMime: file.type,
      size: buffer.byteLength,
      head,
      buffer,
    },
  };
}

/** Content-Disposition için ASCII yedek dosya adı üretir. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

const SAFE_INLINE_MIMES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const DANGEROUS_MIMES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
]);

/**
 * İndirme yanıtı (8. bölüm): nosniff, private no-store, RFC 5987 Content-Disposition.
 * `inline` yalnızca hem uzantı hem MIME türü güvenli önizleme listesinde (pdf/jpg/png) ise onurlanır;
 * tehlikeli MIME türleri (`text/html`, `image/svg+xml` vb.) her zaman `application/octet-stream` + `attachment` döner.
 */
export function buildDownloadResponse(input: {
  stream: ReadableStream<Uint8Array>;
  originalName: string;
  mimeType: string;
  inline: boolean;
}): Response {
  const normalizedMime = (input.mimeType || "").split(";")[0].trim().toLowerCase();
  const isDangerous = !normalizedMime || DANGEROUS_MIMES.has(normalizedMime);
  const safeMime = isDangerous ? "application/octet-stream" : normalizedMime;
  const canInline =
    !isDangerous &&
    INLINE_PREVIEW_EXTENSIONS.includes(getExtension(input.originalName)) &&
    SAFE_INLINE_MIMES.has(safeMime);
  const disposition = input.inline && canInline ? "inline" : "attachment";

  const encodedName = encodeURIComponent(input.originalName);
  const headers = new Headers({
    "Content-Type": safeMime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${disposition}; filename="${asciiFileName(input.originalName)}"; filename*=UTF-8''${encodedName}`,
  });
  if (disposition === "inline") {
    headers.set("Content-Security-Policy", "sandbox");
  }

  return new Response(input.stream, { headers });
}
