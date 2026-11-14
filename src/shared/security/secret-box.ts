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
  return process.env.DATA_ENCRYPTION_LEGACY_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? null;
}

function keyring(): { current: string; keys: Record<string,string> } | null {
  const raw=process.env.DATA_ENCRYPTION_KEYS;
  if(!raw) return null;
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{throw new Error("DATA_KEYRING_INVALID");}
  if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)) throw new Error("DATA_KEYRING_INVALID");
  const keys:Record<string,string>={};
  for(const [id,value] of Object.entries(parsed)) {
    if(!/^[a-zA-Z0-9_-]{1,32}$/.test(id) || typeof value!=="string" || value.length<32) throw new Error("DATA_KEYRING_INVALID");
    keys[id]=value;
  }
  const current=process.env.DATA_ENCRYPTION_CURRENT_KEY ?? "";
  if(!keys[current]) throw new Error("DATA_KEYRING_CURRENT_MISSING");
  return {current,keys};
}

const keyFor = (purpose: string, value: string) => createHash("sha256").update(`verein-erp:${purpose}:${value}`).digest();

export function canEncryptSecrets(): boolean {
  return Boolean(keyring() || secret());
}

export function sealSecret(purpose: string, plainText: string): string {
  const ring = keyring();
  const value = ring ? ring.keys[ring.current] : secret();
  if (!value) throw new Error("Encryption key is not available"); // i18n-ignore (geliştirici hatası; kullanıcıya gösterilmez)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose, value), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return [ring ? `v2:${ring.current}` : FORMAT_VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

export function openSecret(purpose: string, payload: string): string | null {
  const parts=payload.split(":");
  const version=parts.shift();
  const keyId=version==="v2"?parts.shift():null;
  const value=keyId ? keyring()?.keys[keyId] : secret();
  const [iv,tag,encrypted]=parts;
  if (!value || ![FORMAT_VERSION,"v2"].includes(version ?? "") || !iv || !tag || !encrypted || parts.length!==3) return null;
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
  const ring = keyring();
  const value = ring ? ring.keys[ring.current] : secret();
  if (!value) throw new Error("Encryption key is not available"); // i18n-ignore (geliştirici hatası; kullanıcıya gösterilmez)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose, value), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const header=ring ? Buffer.from(`VE2:${ring.current}:`,"ascii") : Buffer.alloc(0);
  return Buffer.concat([header, iv, cipher.getAuthTag(), encrypted]);
}

export function openBytes(purpose: string, payload: Uint8Array): Buffer | null {
  let buffer=Buffer.from(payload);
  let value=secret();
  if(buffer.subarray(0,4).toString("ascii")==="VE2:") {
    const end=buffer.indexOf(58,4);
    if(end<5 || end>36) return null;
    value=keyring()?.keys[buffer.subarray(4,end).toString("ascii")] ?? null;
    buffer=buffer.subarray(end+1);
  }
  if (!value || buffer.length < 28) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose, value), buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]);
  } catch {
    return null;
  }
}
