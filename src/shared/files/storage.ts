import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";

import { getEnv } from "@/shared/env";

/**
 * Paylaşılan yerel disk depolama (Faz 2, 8. bölüm).
 *
 * KARAR: Diskteki yol YALNIZCA veritabanındaki storagePath'ten üretilir;
 * kullanıcının dosya adı yola hiçbir zaman girmez. path.resolve sonucu
 * UPLOAD_DIR içinde değilse işlem reddedilir (path traversal koruması).
 */

/** UPLOAD_DIR kökünü mutlak olarak döner (göreli yollar process.cwd()'ye bağlıdır). */
export function getUploadRoot(): string {
  return path.resolve(process.cwd(), getEnv().UPLOAD_DIR);
}

/** storagePath'i UPLOAD_DIR altındaki mutlak yola çözer; yol dışına çıkışı reddeder. */
export function resolveSafePath(storagePath: string): string {
  const root = getUploadRoot();
  const resolved = path.resolve(root, storagePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Geçersiz depolama yolu.");
  }
  return resolved;
}

/** storedName = uuid + küçük harf uzantı; kullanıcı adı ASLA kullanılmaz (8. bölüm). */
export function makeStoredName(extension: string): string {
  const suffix = extension ? `.${extension.toLowerCase()}` : "";
  return randomUUID() + suffix;
}

/** Dosyayı diske yazar (hedef klasörü oluşturur). */
export async function saveFile(storagePath: string, data: Uint8Array): Promise<void> {
  const resolved = resolveSafePath(storagePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, data);
}

/**
 * Yalnızca yükleme başarısız olduğunda temizlik için kullanılır.
 * Kayıt (yumuşak) silme diskteki dosyaya DOKUNMAZ (Faz 1 md. 4-5, Faz 2 md. 5).
 */
export async function removeFile(storagePath: string): Promise<void> {
  try {
    await unlink(resolveSafePath(storagePath));
  } catch (error) {
    console.error("[shared/files] Geçici dosya temizlenemedi:", error);
  }
}

/** İndirme/önizleme için dosyayı akış (stream) olarak açar. */
export function openReadStream(storagePath: string): ReadableStream<Uint8Array> {
  const stream = createReadStream(resolveSafePath(storagePath));
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

/** SHA-256 özeti (Faz 5: Zuwendungsbestätigung hash kaydı için). */
export function computeSha256(data: Uint8Array): string {
  const hash = createHash("sha256").update(data);
  return hash.digest("hex");
}
