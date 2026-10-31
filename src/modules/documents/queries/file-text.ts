import "server-only";

import { getDb } from "@/shared/db";
import { extractTextFromStoredFile, type ExtractedText } from "@/shared/files/extract-text";

/** Evrak ekinin düz metni (PDF/Word/Excel); silinmiş dosya veya evrak için null. */
export async function getDocumentFileText(fileId: string): Promise<({ documentId: string; originalName: string; mimeType: string } & ExtractedText) | null> {
  const file = await getDb().documentFile.findFirst({
    where: { id: fileId, deletedAt: null, document: { deletedAt: null } },
    select: { documentId: true, originalName: true, mimeType: true, storagePath: true },
  });
  if (!file) return null;
  const extracted = await extractTextFromStoredFile(file.storagePath, file.mimeType);
  return { documentId: file.documentId, originalName: file.originalName, mimeType: file.mimeType, ...extracted };
}
