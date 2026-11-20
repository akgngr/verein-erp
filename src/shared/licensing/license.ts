/**
 * Lisans (RFC-002, #419) — biçim "vlic-1":
 *   JSON { format, payload, signature: { keyId, value } }
 * İmza: Ed25519, imzalanan veri = canonicalJson(payload). Doğrulama çevrimdışıdır; açık anahtarlar
 * src/config/license-issuers.json içindedir (yalnız kod incelemesiyle değişir). Özel anahtar ASLA depoda olmaz.
 *
 * Bağlama (ürün sahibi kararı): lisans yalnız **alan adı VE kurum** birlikte eşleşirse geçerlidir.
 * Süre bitince ek süre (grace) boyunca özellikler açık kalır ve yöneticiye uyarı gösterilir.
 * Saf Node kodu: sunucu, CLI ve testler kullanır.
 */
import { createPublicKey, sign as edSign, verify as edVerify, type KeyObject } from "node:crypto";

import { canonicalJson, keyIdOf } from "../marketplace/package";

export const LICENSE_FORMAT = "vlic-1";
export const DEFAULT_GRACE_DAYS = 14;
const FEATURE = /^[a-z][a-z0-9-]{1,40}$/;

export type LicensePayload = {
  licenseId: string;
  tier: "enterprise" | "business";
  organisation: { name: string; registryId?: string };
  /** Uygulamanın genel alan adı (APP_URL'nin hostname'i), ör. "erp.verein.de". */
  domain: string;
  features: string[];
  issuedAt: string;
  expiresAt: string;
};

export type LicenseDocument = {
  format: typeof LICENSE_FORMAT;
  payload: LicensePayload;
  signature: { keyId: string; value: string };
};

export type LicenseIssuer = { keyId: string; publicKey: string; label?: string };

export type LicenseInstance = { domain: string | null; organisation: { name: string | null; registryId?: string | null } };

export type LicenseStatus =
  | { state: "none" }
  | { state: "invalid"; reason: "format" | "signature" | "issuer" }
  | { state: "mismatch"; reason: "domain" | "organisation"; payload: LicensePayload }
  | { state: "expired"; payload: LicensePayload }
  | { state: "grace"; payload: LicensePayload; graceEndsAt: string }
  | { state: "valid"; payload: LicensePayload };

const MAX_LICENSE_CHARS = 16_000;

/** Karşılaştırma için kurum adı/sicil: büyük-küçük harf, boşluk ve noktalama farkı önemsiz. */
export function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("de-DE")
    .replace(/[\s.,;:'"()\-_/]+/g, "");
}

export function normalizeDomain(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/:].*$/, "").replace(/\.$/, "");
}

/** Metni lisans belgesine çözer; biçim hatalıysa null (istisna fırlatmaz). */
export function parseLicense(text: string): LicenseDocument | null {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_LICENSE_CHARS) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return null;
  }
  const doc = raw as Partial<LicenseDocument>;
  const p = doc?.payload as Partial<LicensePayload> | undefined;
  if (doc?.format !== LICENSE_FORMAT || !p || !doc.signature) return null;
  if (typeof doc.signature.keyId !== "string" || typeof doc.signature.value !== "string") return null;
  if (typeof p.licenseId !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(p.licenseId)) return null;
  if (p.tier !== "enterprise" && p.tier !== "business") return null;
  if (!p.organisation || typeof p.organisation.name !== "string" || !p.organisation.name.trim()) return null;
  if (p.organisation.registryId !== undefined && typeof p.organisation.registryId !== "string") return null;
  if (typeof p.domain !== "string" || !normalizeDomain(p.domain)) return null;
  if (!Array.isArray(p.features) || p.features.length > 50 || !p.features.every((f) => typeof f === "string" && FEATURE.test(f))) return null;
  if (typeof p.issuedAt !== "string" || Number.isNaN(Date.parse(p.issuedAt))) return null;
  if (typeof p.expiresAt !== "string" || Number.isNaN(Date.parse(p.expiresAt))) return null;
  return doc as LicenseDocument;
}

/** Yalnız imza (kurulum eşleşmesinden bağımsız). */
export function verifyLicenseSignature(doc: LicenseDocument, issuers: readonly LicenseIssuer[]): "ok" | "issuer" | "signature" {
  const issuer = issuers.find((entry) => entry.keyId === doc.signature.keyId);
  if (!issuer) return "issuer";
  try {
    if (keyIdOf(issuer.publicKey) !== issuer.keyId) return "issuer";
    const ok = edVerify(null, Buffer.from(canonicalJson(doc.payload)), createPublicKey(issuer.publicKey), Buffer.from(doc.signature.value, "base64"));
    return ok ? "ok" : "signature";
  } catch {
    return "signature";
  }
}

/** Lisansın bu kurulumdaki durumu. */
export function evaluateLicense(
  text: string | null | undefined,
  issuers: readonly LicenseIssuer[],
  instance: LicenseInstance,
  options: { now?: Date; graceDays?: number } = {},
): LicenseStatus {
  if (!text) return { state: "none" };
  const doc = parseLicense(text);
  if (!doc) return { state: "invalid", reason: "format" };
  const signature = verifyLicenseSignature(doc, issuers);
  if (signature !== "ok") return { state: "invalid", reason: signature };
  const payload = doc.payload;
  if (!instance.domain || normalizeDomain(payload.domain) !== normalizeDomain(instance.domain)) return { state: "mismatch", reason: "domain", payload };
  const nameOk = normalizeIdentity(payload.organisation.name) === normalizeIdentity(instance.organisation.name);
  const registryOk = !payload.organisation.registryId || normalizeIdentity(payload.organisation.registryId) === normalizeIdentity(instance.organisation.registryId);
  if (!nameOk || !registryOk) return { state: "mismatch", reason: "organisation", payload };
  const now = options.now ?? new Date();
  const expires = new Date(payload.expiresAt);
  if (now.getTime() <= expires.getTime()) return { state: "valid", payload };
  const graceEnds = new Date(expires.getTime() + (options.graceDays ?? DEFAULT_GRACE_DAYS) * 86_400_000);
  if (now.getTime() <= graceEnds.getTime()) return { state: "grace", payload, graceEndsAt: graceEnds.toISOString() };
  return { state: "expired", payload };
}

/** Özellik açık mı: yalnız geçerli veya ek süredeki lisansta, listelenen özellik. */
export function statusHasFeature(status: LicenseStatus, feature: string): boolean {
  return (status.state === "valid" || status.state === "grace") && status.payload.features.includes(feature);
}

/** Lisans üretimi (yalnız CLI; özel anahtar yayıncıda kalır). */
export function signLicense(payload: LicensePayload, privateKey: KeyObject, publicKeyPem: string): LicenseDocument {
  const value = edSign(null, Buffer.from(canonicalJson(payload)), privateKey).toString("base64");
  return { format: LICENSE_FORMAT, payload, signature: { keyId: keyIdOf(publicKeyPem), value } };
}
