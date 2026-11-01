/**
 * İmzalı modül paketi (.vmod) — biçim "vmod-1":
 *   gzip( JSON { format, manifest, files: { "<göreli yol>": "<base64>" }, signature } )
 * İmza: Ed25519, imzalanan veri = canonicalPayload(manifest) (dosya hash'leri manifest'te).
 * Bu dosya saf Node kodudur; hem CLI (scripts/module-*.ts) hem sunucu kullanır.
 */
import { createHash, createPublicKey, sign as edSign, verify as edVerify, type KeyObject } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

export const PACKAGE_FORMAT = "vmod-1";
export const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 2000;
const ALLOWED_EXTENSIONS = new Set(["ts", "tsx", "json", "prisma", "sql", "md", "css", "svg", "png", "jpg", "webp", "txt"]);
const KEY_PATTERN = /^[a-z][a-z0-9-]{1,40}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

export type PackageManifest = {
  key: string;
  version: string;
  name: string;
  description: string;
  publisher: string;
  category: "EXTENSION" | "OFFICIAL" | "CORE";
  /** En düşük uygulama sürümü (package.json). */
  minAppVersion?: string;
  createdAt: string;
  /** Göreli yol → sha256 (hex). */
  files: Record<string, string>;
};

export type ModulePackage = {
  format: typeof PACKAGE_FORMAT;
  manifest: PackageManifest;
  files: Record<string, string>;
  signature: { publisher: string; keyId: string; value: string };
};

export type TrustedPublisher = { publisher: string; keyId: string; publicKey: string; official?: boolean };

export type VerificationResult = {
  ok: boolean;
  manifest: PackageManifest | null;
  trusted: TrustedPublisher | null;
  errors: string[];
};

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

/** Anahtar sıralı, boşluksuz JSON (imzanın deterministik olması için). */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Public key parmak izi (kısa kimlik). */
export function keyIdOf(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return sha256(der).slice(0, 16);
}

/** Paket içi yol güvenli mi? (mutlak/üst dizin/gizli dosya/uzantı) */
export function isSafePackagePath(file: string): boolean {
  if (!file || file.length > 200 || file.includes("\0") || file.includes("\\")) return false;
  if (file.startsWith("/") || /^[a-zA-Z]:/.test(file)) return false;
  const parts = file.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || part.startsWith("."))) return false;
  if (parts[0] === "node_modules" || parts.includes("node_modules")) return false;
  const extension = file.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(extension);
}

export function buildPackage(input: { manifest: Omit<PackageManifest, "files" | "createdAt">; files: Record<string, Buffer>; privateKey: KeyObject; publicKeyPem: string; createdAt?: Date }): Buffer {
  const fileHashes: Record<string, string> = {};
  const encoded: Record<string, string> = {};
  for (const [file, content] of Object.entries(input.files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!isSafePackagePath(file)) throw new Error(`unsafe path: ${file}`);
    fileHashes[file] = sha256(content);
    encoded[file] = content.toString("base64");
  }
  const manifest: PackageManifest = { ...input.manifest, createdAt: (input.createdAt ?? new Date()).toISOString(), files: fileHashes };
  const value = edSign(null, Buffer.from(canonicalJson(manifest)), input.privateKey).toString("base64");
  const pkg: ModulePackage = { format: PACKAGE_FORMAT, manifest, files: encoded, signature: { publisher: manifest.publisher, keyId: keyIdOf(input.publicKeyPem), value } };
  return gzipSync(Buffer.from(JSON.stringify(pkg)));
}

export function readPackage(data: Buffer): ModulePackage {
  if (data.length > MAX_PACKAGE_BYTES) throw new Error("package too large");
  const json = gunzipSync(data, { maxOutputLength: MAX_PACKAGE_BYTES * 2 }).toString("utf8");
  return JSON.parse(json) as ModulePackage;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * Paketi doğrular: biçim, manifest alanları, dosya yolları, hash'ler, imza ve güvenilen yayıncı.
 * Üçüncü taraf (official olmayan) yayıncı CORE/OFFICIAL kategori kullanamaz.
 */
export function verifyPackage(pkg: ModulePackage, trusted: TrustedPublisher[], options: { appVersion?: string } = {}): VerificationResult {
  const errors: string[] = [];
  const manifest = pkg?.manifest ?? null;
  if (pkg?.format !== PACKAGE_FORMAT) errors.push("format");
  if (!manifest || typeof manifest !== "object") return { ok: false, manifest: null, trusted: null, errors: [...errors, "manifest"] };
  if (!KEY_PATTERN.test(manifest.key ?? "")) errors.push("key");
  if (!SEMVER.test(manifest.version ?? "")) errors.push("version");
  if (!manifest.name || !manifest.publisher) errors.push("manifest");
  if (!["EXTENSION", "OFFICIAL", "CORE"].includes(manifest.category)) errors.push("category");
  const declared = Object.keys(manifest.files ?? {});
  const shipped = Object.keys(pkg.files ?? {});
  if (declared.length === 0 || declared.length > MAX_FILES) errors.push("files");
  if (!declared.includes("module.config.ts")) errors.push("moduleConfig");
  for (const file of new Set([...declared, ...shipped])) {
    if (!isSafePackagePath(file)) {
      errors.push(`path:${file}`);
      continue;
    }
    const content = pkg.files[file];
    if (content === undefined || manifest.files[file] === undefined) {
      errors.push(`mismatch:${file}`);
      continue;
    }
    if (sha256(Buffer.from(content, "base64")) !== manifest.files[file]) errors.push(`hash:${file}`);
  }
  if (options.appVersion && manifest.minAppVersion && SEMVER.test(manifest.minAppVersion) && compareSemver(options.appVersion, manifest.minAppVersion) < 0) errors.push("appVersion");

  const publisher = trusted.find((entry) => entry.keyId === pkg.signature?.keyId && entry.publisher === pkg.signature?.publisher) ?? null;
  if (!publisher) errors.push("untrusted");
  else {
    let valid = false;
    try {
      valid = edVerify(null, Buffer.from(canonicalJson(manifest)), createPublicKey(publisher.publicKey), Buffer.from(pkg.signature.value, "base64"));
    } catch {
      valid = false;
    }
    if (!valid) errors.push("signature");
    if (manifest.publisher !== publisher.publisher) errors.push("publisher");
    if (!publisher.official && manifest.category !== "EXTENSION") errors.push("categoryNotAllowed");
  }
  return { ok: errors.length === 0, manifest, trusted: publisher, errors };
}

/** Paketteki dosyaları (yol → içerik) döndürür; çağırmadan önce verifyPackage ok olmalı. */
export function packageFiles(pkg: ModulePackage): Record<string, Buffer> {
  return Object.fromEntries(Object.entries(pkg.files).map(([file, content]) => [file, Buffer.from(content, "base64")]));
}
