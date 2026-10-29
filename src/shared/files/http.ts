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
  return {
    ok: true,
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

/**
 * İndirme yanıtı (8. bölüm): nosniff, private no-store, RFC 5987 Content-Disposition.
 * `inline` yalnızca pdf/jpg/png için onurlanır; diğer her tür attachment döner.
 */
export function buildDownloadResponse(input: {
  stream: ReadableStream<Uint8Array>;
  originalName: string;
  mimeType: string;
  inline: boolean;
}): Response {
  const canInline = INLINE_PREVIEW_EXTENSIONS.includes(getExtension(input.originalName));
  const disposition = input.inline && canInline ? "inline" : "attachment";

  const encodedName = encodeURIComponent(input.originalName);
  const headers = new Headers({
    "Content-Type": input.mimeType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${disposition}; filename="${asciiFileName(input.originalName)}"; filename*=UTF-8''${encodedName}`,
  });

  return new Response(input.stream, { headers });
}
