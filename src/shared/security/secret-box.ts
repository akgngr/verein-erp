import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Veritabanında saklanan sırlar (API anahtarları vb.) için AES-256-GCM. Anahtar uygulamanın
 * mevcut AUTH_SECRET değerinden amaç etiketiyle türetilir; böylece her kullanım alanı ayrı
 * anahtar alır ve ek yapılandırma gerekmez. Biçim: `v1:<iv>:<tag>:<şifreli>` (base64).
 * AUTH_SECRET değişirse kayıtlı sırlar çözülemez (null döner) ve yeniden girilmelidir.
 */
const FORMAT_VERSION = "v1";

function secret(): string | null {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null;
}

const keyFor = (purpose: string, value: string) => createHash("sha256").update(`verein-erp:${purpose}:${value}`).digest();

export function canEncryptSecrets(): boolean {
  return Boolean(secret());
}

export function sealSecret(purpose: string, plainText: string): string {
  const value = secret();
  if (!value) throw new Error("Encryption key is not available"); // i18n-ignore (geliştirici hatası; kullanıcıya gösterilmez)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose, value), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return [FORMAT_VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

export function openSecret(purpose: string, payload: string): string | null {
  const value = secret();
  if (!value) return null;
  const [version, iv, tag, encrypted] = payload.split(":");
  if (version !== FORMAT_VERSION || !iv || !tag || !encrypted) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose, value), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Dosya içerikleri için: AES-256-GCM, çıktı `iv(12) | tag(16) | şifreli` baytları. */
export function sealBytes(purpose: string, data: Uint8Array): Buffer {
  const value = secret();
  if (!value) throw new Error("Encryption key is not available"); // i18n-ignore (geliştirici hatası; kullanıcıya gösterilmez)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose, value), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function openBytes(purpose: string, payload: Uint8Array): Buffer | null {
  const value = secret();
  if (!value || payload.length < 28) return null;
  const buffer = Buffer.from(payload);
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose, value), buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]);
  } catch {
    return null;
  }
}
