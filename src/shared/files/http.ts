import "server-only";

import { INLINE_PREVIEW_EXTENSIONS } from "./file-types";
import { getExtension } from "./validation";

/**
 * HTTP yardımcıları (Faz 2, 8. bölüm): multipart yükleme ayrıştırma ve
 * Faz 1 başlık kurallarını birebir uygulayan indirme yanıtı.
 */

export type ParsedUpload =
  | { ok: true; file: { name: string; type: string; buffer: Buffer } }
  | { ok: false; status: 400; error: string };

/** multipart/form-data içindeki "file" alanını okur; hata durumunda JSON mesaj döner. */
export async function parseSingleFileUpload(request: Request): Promise<ParsedUpload> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Dosya okunamadı (multipart/form-data bekleniyor).",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, status: 400, error: "Dosya bulunamadı." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { ok: true, file: { name: file.name, type: file.type, buffer } };
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
