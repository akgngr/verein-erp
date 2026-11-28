import "server-only";

import type { CreateDocumentWithFilesInput, CreateDocumentWithFilesResult } from "@/modules/documents/server";
import { getDb } from "@/shared/db";
import { readFile } from "@/shared/files";

/** Injected so this flow can be tested without loading the documents module's action barrel. */
type CreateDocumentWithFiles = (input: CreateDocumentWithFilesInput) => Promise<CreateDocumentWithFilesResult>;

/** A transfer that has not finished within this window (crashed worker) may be claimed again. */
const DOCUMENT_IMPORT_CLAIM_STALE_MS = 5 * 60_000;

export type ImportMessageToDocumentsResult =
  | { ok: true; documentId: string; registryNumber: string; attachedCount: number; skippedCount: number; totalCount: number }
  | { ok: false; reason: "duplicate"; documentId: string }
  | { ok: false; reason: "inProgress" };

/**
 * Gelen e-postayı (meta veriler + belge ekleri) Evrak Kayıt modülüne gelen evrak olarak aktarır.
 * Bağlantı e-posta düzeyinde (`importedDocumentId`) tutulur: eki olmayan ya da ekleri muhasebeye
 * aktarılmış e-posta da ikinci kez kayıt açmaz. Eşzamanlı iki aktarımdan yalnız biri kayıt açar.
 * Yalnız belgeye gerçekten eklenen ekler "aktarıldı" işaretlenir; atlanan ek kaldıkça e-posta açık kalır.
 */
export async function importMessageToDocumentsWith(
  deps: { createDocumentWithFiles: CreateDocumentWithFiles },
  messageId: string,
  actor: { id: string; label: string },
): Promise<ImportMessageToDocumentsResult> {
  const db = getDb();
  const message = await db.mailInboxMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { attachments: true },
  });
  if (message.importedDocumentId) {
    return { ok: false, reason: "duplicate", documentId: message.importedDocumentId };
  }

  const claimedAt = new Date();
  const claim = await db.mailInboxMessage.updateMany({
    where: {
      id: messageId,
      importedDocumentId: null,
      OR: [
        { documentImportStartedAt: null },
        { documentImportStartedAt: { lt: new Date(claimedAt.getTime() - DOCUMENT_IMPORT_CLAIM_STALE_MS) } },
      ],
    },
    data: { documentImportStartedAt: claimedAt },
  });
  if (claim.count === 0) {
    const current = await db.mailInboxMessage.findUniqueOrThrow({
      where: { id: messageId },
      select: { importedDocumentId: true },
    });
    return current.importedDocumentId
      ? { ok: false, reason: "duplicate", documentId: current.importedDocumentId }
      : { ok: false, reason: "inProgress" };
  }

  let created: Awaited<ReturnType<CreateDocumentWithFiles>>;
  try {
    const files: Array<{ key: string; originalName: string; mimeType: string; buffer: Buffer }> = [];
    for (const att of message.attachments) {
      try {
        files.push({ key: att.id, originalName: att.fileName, mimeType: att.mimeType, buffer: await readFile(att.storagePath) });
      } catch {
        // A stored file missing on disk stays unimported and is reported as skipped.
      }
    }
    const counterparty = [message.fromName, message.fromAddress].filter(Boolean).join(" · ") || "—";
    created = await deps.createDocumentWithFiles({
      direction: "INCOMING",
      documentDate: message.receivedAt,
      counterparty,
      subject: message.subject || "—",
      summary: message.snippet,
      referenceNumber: message.messageId?.slice(0, 100) ?? null,
      deliveryMethod: "EMAIL",
      files,
      actor,
    });
  } catch (error) {
    await db.mailInboxMessage.updateMany({
      where: { id: messageId, documentImportStartedAt: claimedAt, importedDocumentId: null },
      data: { documentImportStartedAt: null },
    });
    throw error;
  }

  const stored = new Set(created.attachedKeys);
  if (stored.size > 0) {
    await db.mailInboxAttachment.updateMany({
      where: { id: { in: [...stored] }, messageId, importedTo: null },
      data: { importedTo: `documents.document:${created.id}`, importedAt: new Date() },
    });
  }
  const open = await db.mailInboxAttachment.count({ where: { messageId, importedTo: null } });
  await db.mailInboxMessage.update({
    where: { id: messageId },
    data: { importedDocumentId: created.id, documentImportStartedAt: null, ...(open === 0 ? { status: "DONE" } : {}) },
  });

  const totalCount = message.attachments.length;
  return {
    ok: true,
    documentId: created.id,
    registryNumber: created.registryNumber,
    attachedCount: stored.size,
    skippedCount: totalCount - stored.size,
    totalCount,
  };
}
