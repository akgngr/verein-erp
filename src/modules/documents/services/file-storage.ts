import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";

import { getEnv } from "@/shared/env";

/**
 * Yerel disk depolama (7. bölüm).
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
export function resolveStoragePath(storagePath: string): string {
  const root = getUploadRoot();
  const resolved = path.resolve(root, storagePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Geçersiz depolama yolu.");
  }
  return resolved;
}

/** Veritabanına yazılacak göreli yol: <yıl>/<documentId>/<storedName>. */
export function buildStoragePath(year: number, documentId: string, storedName: string): string {
  return path.posix.join(String(year), documentId, storedName);
}

/** storedName = uuid + küçük harf uzantı; kullanıcı adı ASLA kullanılmaz. */
export function makeStoredName(extension: string): string {
  const suffix = extension ? `.${extension.toLowerCase()}` : "";
  return randomUUID() + suffix;
}

/** Dosyayı diske yazar (hedef klasörü oluşturur). */
export async function saveFile(storagePath: string, data: Uint8Array): Promise<void> {
  const resolved = resolveStoragePath(storagePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, data);
}

/**
 * Yalnızca yükleme başarısız olduğunda temizlik için kullanılır.
 * Kayıt silme (yumuşak) diskteki dosyaya DOKUNMAZ (5. bölüm md. 4-5).
 */
export async function cleanupFile(storagePath: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storagePath));
  } catch (error) {
    console.error("[file-storage] Geçici dosya temizlenemedi:", error);
  }
}

export async function getFileSize(storagePath: string): Promise<number> {
  const info = await stat(resolveStoragePath(storagePath));
  return info.size;
}

/** İndirme/önizleme için dosyayı akış (stream) olarak açar. */
export function openFileStream(storagePath: string): ReadableStream<Uint8Array> {
  const stream = createReadStream(resolveStoragePath(storagePath));
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}
