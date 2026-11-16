import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { openBytes, sealBytes } from "@/shared/security/secret-box";

import { getUploadRoot } from "./storage";

/**
 * Geçici yüklemeler (ör. asistan sohbet eki): dosya, kullanıcının bir sonraki onaylı işleminde (evrak kaydı vb.)
 * kalıcı kayda eklenebilsin diye kısa süre şifreli tutulur. Yalnız aynı kullanıcı açabilir; süresi dolan dosya
 * okunamaz ve sonraki yazmada silinir. İçerik ve meta veri AES-256-GCM ile şifrelidir (dosya adı dahil).
 */
const PURPOSE = "temp-upload";
export const TEMP_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const REF = /^[0-9a-f-]{36}$/;

export type TempUploadMeta = { originalName: string; mimeType: string; extension: string; size: number };
type Envelope = TempUploadMeta & { ownerId: string; expiresAt: number };

const directory = () => path.join(getUploadRoot(), ".tmp", "uploads");
const fileFor = (ref: string) => path.join(directory(), `${ref}.bin`);

/** Dosyayı şifreleyip saklar; açmak için gereken başvuru kimliğini döner. */
export async function saveTempUpload(ownerId: string, data: Uint8Array, meta: TempUploadMeta, now = Date.now()): Promise<string> {
  await mkdir(directory(), { recursive: true });
  void purgeExpiredTempUploads(now).catch(() => {});
  const ref = randomUUID();
  const envelope = Buffer.from(JSON.stringify({ ...meta, ownerId, expiresAt: now + TEMP_UPLOAD_TTL_MS } satisfies Envelope), "utf8");
  // Biçim: 4 bayt meta uzunluğu | şifreli meta | şifreli içerik.
  const sealedMeta = sealBytes(PURPOSE, envelope);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(sealedMeta.length);
  await writeFile(fileFor(ref), Buffer.concat([header, sealedMeta, sealBytes(PURPOSE, data)]), { mode: 0o600 });
  return ref;
}

/** Sahibi ve süresi doğrulanırsa dosyayı döner; aksi hâlde null. */
export async function readTempUpload(ownerId: string, ref: string, now = Date.now()): Promise<{ data: Buffer; meta: TempUploadMeta } | null> {
  if (!REF.test(ref)) return null;
  const raw = await readFile(fileFor(ref)).catch(() => null);
  if (!raw || raw.length < 4) return null;
  const length = raw.readUInt32BE(0);
  const metaBytes = openBytes(PURPOSE, raw.subarray(4, 4 + length));
  const data = openBytes(PURPOSE, raw.subarray(4 + length));
  if (!metaBytes || !data) return null;
  try {
    const envelope = JSON.parse(metaBytes.toString("utf8")) as Envelope;
    if (envelope.ownerId !== ownerId || envelope.expiresAt < now) return null;
    const { originalName, mimeType, extension, size } = envelope;
    return { data, meta: { originalName, mimeType, extension, size } };
  } catch {
    return null;
  }
}

export async function deleteTempUpload(ref: string): Promise<void> {
  if (REF.test(ref)) await rm(fileFor(ref), { force: true });
}

/** Süresi dolmuş geçici dosyaları siler (dosya değişiklik zamanına göre; şifre çözülmez). */
export async function purgeExpiredTempUploads(now = Date.now()): Promise<number> {
  const names = await readdir(directory()).catch(() => [] as string[]);
  let removed = 0;
  for (const name of names) {
    const full = path.join(directory(), name);
    const info = await stat(full).catch(() => null);
    if (info && now - info.mtimeMs > TEMP_UPLOAD_TTL_MS) {
      await rm(full, { force: true });
      removed++;
    }
  }
  return removed;
}
