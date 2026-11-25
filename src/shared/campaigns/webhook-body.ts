import { timingSafeEqual } from "node:crypto";

/**
 * #581: Sağlayıcı webhook gövdesini boyut sınırıyla okur. `Content-Length` sınırı aşıyorsa veya akış
 * sınırı aşarsa okuma durur ve `null` döner (çağıran 413 verir). Oturumsuz uçlar büyük gövdeyle bellek
 * tüketimine açık kalmaz. Varsayılan sınır sağlayıcı bildirimleri için bol yeterlidir (64 KB).
 */
export const WEBHOOK_MAX_BYTES = 64 * 1024;

export async function readWebhookBody(request: Request, maxBytes = WEBHOOK_MAX_BYTES): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Sabit zamanlı karşılaştırma için bayt uzunlukları eşit olmalı (UTF-8; `string.length` değil). */
export function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.byteLength !== b.byteLength || b.byteLength === 0) return false;
  return timingSafeEqual(a, b);
}
