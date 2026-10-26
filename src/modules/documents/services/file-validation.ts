import "server-only";

import type { FileTypeRule } from "../constants";
import {
  ALLOWED_EXTENSIONS,
  FILE_TYPE_RULES,
  GENERIC_MIME_FALLBACKS,
  MAGIC_SIGNATURE_BYTES,
} from "../constants";

export type ValidatedFile = {
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
};

export type FileValidationResult =
  | { ok: true; file: ValidatedFile; rule: FileTypeRule }
  | { ok: false; error: string };

/** Dosya adından izinli uzantıyı çıkarır (nokta dahil değil, küçük harf). */
export function getExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === base.length - 1) return "";
  return base.slice(dotIndex + 1).toLowerCase();
}

/**
 * Kullanıcının dosya adı yalnızca veritabanındaki originalName alanında tutulur;
 * kontrol karakterleri ve yol ayırıcılar temizlenir (7. bölüm).
 */
export function sanitizeOriginalName(fileName: string): string {
  const cleaned = fileName
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^\.+/, "")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "dosya";
  return cleaned.slice(0, 200);
}

function findRule(extension: string): FileTypeRule | undefined {
  return FILE_TYPE_RULES.find((rule) => rule.extensions.includes(extension));
}

function hasMagicSignature(head: Uint8Array, signature: readonly number[]): boolean {
  if (head.length < signature.length) return false;
  return signature.every((byte, index) => head[index] === byte);
}

/**
 * Yükleme doğrulaması (7. bölüm): uzantı izin listesinde mi, bildirilen MIME
 * uzantıyla uyumlu mu, dosya imzası (magic bytes) uzantıyla tutarlı mı?
 * Boyut sınırı da burada denetlenir. Uyumsuzlukta neden açıklayan hata döner.
 */
export function validateFile(input: {
  originalName: string;
  declaredMime: string;
  size: number;
  maxBytes: number;
  head: Uint8Array;
}): FileValidationResult {
  const originalName = sanitizeOriginalName(input.originalName);
  const extension = getExtension(originalName);

  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return { ok: false, error: "Bu dosya türü kabul edilmiyor." };
  }

  if (input.size <= 0) {
    return { ok: false, error: "Boş dosya yüklenemez." };
  }
  if (input.size > input.maxBytes) {
    const maxMb = Math.floor(input.maxBytes / (1024 * 1024));
    return { ok: false, error: `Dosya en fazla ${maxMb} MB olabilir.` };
  }

  const rule = findRule(extension);
  if (!rule) {
    return { ok: false, error: "Bu dosya türü kabul edilmiyor." };
  }

  // MIME uyumu: kural listesi ya da genel (zip tabanlı ofis) değerler kabul edilir;
  // asıl güvenlik kapısı aşağıdaki magic byte kontrolüdür.
  const mime = (input.declaredMime || "").split(";")[0].trim().toLowerCase();
  const mimeCompatible = rule.mimes.includes(mime) || GENERIC_MIME_FALLBACKS.includes(mime);
  if (rule.mimes.length > 0 && !mimeCompatible) {
    return {
      ok: false,
      error: `Dosya içeriği .${extension} uzantısıyla uyumlu değil.`,
    };
  }

  if (rule.signature !== "none") {
    const signature = MAGIC_SIGNATURE_BYTES[rule.signature];
    if (!hasMagicSignature(input.head, signature)) {
      return {
        ok: false,
        error: `Dosya içeriği .${extension} uzantısıyla uyumlu değil.`,
      };
    }
  }

  return {
    ok: true,
    rule,
    file: { originalName, extension, mimeType: rule.mimes[0] ?? mime, size: input.size },
  };
}
