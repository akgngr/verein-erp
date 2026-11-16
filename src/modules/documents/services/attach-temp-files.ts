import "server-only";

import path from "node:path";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { validateUpload } from "@/shared/files";
import { deleteTempUpload, readTempUpload } from "@/shared/files/temp-uploads";
import { buildUserLabel } from "@/shared/utils";

import { ALLOWED_EXTENSIONS, MAX_FILES_PER_DOCUMENT } from "../constants";
import { makeStoredName, saveFile, cleanupFile } from "./file-storage";

/**
 * Asistan sohbetinde eklenen dosyaları (geçici şifreli depo) onaylanan evrak kaydına ekler.
 * Her dosya normal yükleme kurallarıyla (uzantı, imza, boyut, kayıt başına sınır) yeniden doğrulanır.
 * Dönen değer: eklenen ve atlanan dosya sayısı (süresi dolmuş, başka kullanıcıya ait ya da izinsiz tür atlanır).
 */
export async function attachTempFilesToDocument(
  documentId: string,
  refs: readonly string[],
  user: { id: string; name: string; email: string },
  maxBytes: number,
): Promise<{ attached: number; skipped: number }> {
  const db = getDb();
  const doc = await db.document.findFirst({ where: { id: documentId, deletedAt: null }, select: { id: true, year: true, registryNumber: true } });
  if (!doc) return { attached: 0, skipped: refs.length };
  let count = await db.documentFile.count({ where: { documentId: doc.id, deletedAt: null } });
  let attached = 0;
  for (const ref of refs) {
    const upload = await readTempUpload(user.id, ref);
    if (!upload || count >= MAX_FILES_PER_DOCUMENT) continue;
    const validation = validateUpload({
      file: { originalName: upload.meta.originalName, declaredMime: upload.meta.mimeType, size: upload.data.length, head: upload.data.subarray(0, 16) },
      allowedExtensions: ALLOWED_EXTENSIONS,
      maxBytes,
    });
    if (!validation.ok) continue;
    const storedName = makeStoredName(validation.file.extension);
    const storagePath = path.posix.join(String(doc.year), doc.id, storedName);
    await saveFile(storagePath, upload.data);
    try {
      const created = await db.documentFile.create({
        data: { documentId: doc.id, originalName: validation.file.originalName, storedName, storagePath, mimeType: validation.file.mimeType, size: validation.file.size, uploadedById: user.id, uploadedByLabel: buildUserLabel(user.name, user.email) },
      });
      await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "FILE_UPLOAD", entity: "DocumentFile", entityId: created.id, after: { registryNumber: doc.registryNumber, fileName: created.originalName, size: created.size, source: "ai" } });
      await deleteTempUpload(ref);
      attached++;
      count++;
    } catch (error) {
      await cleanupFile(storagePath);
      console.error("[documents] AI_ATTACH_FAILED", error instanceof Error ? error.message.split("\n")[0].slice(0, 200) : typeof error);
    }
  }
  return { attached, skipped: refs.length - attached };
}
