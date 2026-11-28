import "server-only";

import path from "node:path";

import { writeAudit } from "@/shared/audit/write-audit";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import {
  makeStoredName,
  removeFile,
  saveFile,
  uploadErrorMessage,
  validateUpload,
} from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";

import { documentRegisteredEvent } from "../automation";
import {
  ALLOWED_EXTENSIONS,
  DEFAULT_STATUS_BY_DIRECTION,
  MAX_FILES_PER_DOCUMENT,
} from "../constants";
import { berlinYear } from "../utils";
import { allocateRegistryNumber, runWithRegistryRetry } from "./registry-number";

export type DocumentFileInput = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

export type CreateDocumentWithFilesInput = {
  direction: "INCOMING" | "OUTGOING";
  documentDate: Date;
  counterparty: string;
  subject: string;
  summary?: string | null;
  referenceNumber?: string | null;
  deliveryMethod?: "POST" | "EMAIL" | "HAND" | "COURIER" | "REGISTERED_MAIL" | "FAX" | "OTHER";
  actor: { id: string; label: string };
  files?: DocumentFileInput[];
  auditMeta?: Record<string, unknown>;
};

export type CreateDocumentWithFilesResult = {
  id: string;
  registryNumber: string;
  fileCount: number;
};

/**
 * Yetkili diğer modüllerin (örn. mail, meetings) evrak kaydı + ek dosyaları
 * tek akışta güvenli biçimde oluşturmasını sağlar.
 */
export async function createDocumentWithFiles(
  input: CreateDocumentWithFilesInput,
): Promise<CreateDocumentWithFilesResult> {
  const files = input.files ?? [];
  if (files.length > MAX_FILES_PER_DOCUMENT) {
    throw new Error(
      await translateMessage("files.maxPerRecord", { max: MAX_FILES_PER_DOCUMENT }),
    );
  }

  const maxBytes = getEnv().MAX_UPLOAD_MB * 1024 * 1024;
  const validatedFiles: Array<{
    originalName: string;
    extension: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  }> = [];

  for (const file of files) {
    const validation = validateUpload({
      file: {
        originalName: file.originalName,
        declaredMime: file.mimeType,
        size: file.buffer.length,
        head: file.buffer.subarray(0, 16),
      },
      allowedExtensions: ALLOWED_EXTENSIONS,
      maxBytes,
    });
    if (!validation.ok) {
      throw new Error(await uploadErrorMessage(validation));
    }
    validatedFiles.push({
      originalName: validation.file.originalName,
      extension: validation.file.extension,
      mimeType: validation.file.mimeType,
      size: validation.file.size,
      buffer: file.buffer,
    });
  }

  const db = getDb();
  const registeredAt = new Date();
  const year = berlinYear(registeredAt);
  const status = DEFAULT_STATUS_BY_DIRECTION[input.direction];

  const created = await runWithRegistryRetry(() =>
    db.$transaction(async (tx) => {
      const { sequence, registryNumber } = await allocateRegistryNumber(
        tx,
        input.direction,
        year,
      );
      const document = await tx.document.create({
        data: {
          direction: input.direction,
          year,
          sequence,
          registryNumber,
          registeredAt,
          documentDate: input.documentDate,
          counterparty: input.counterparty.trim().slice(0, 160),
          referenceNumber: input.referenceNumber?.trim().slice(0, 80) || null,
          subject: input.subject.trim().slice(0, 200),
          summary: input.summary?.trim().slice(0, 2000) || null,
          deliveryMethod: input.deliveryMethod ?? "EMAIL",
          status,
          createdById: input.actor.id,
          createdByLabel: input.actor.label,
          updatedById: input.actor.id,
          updatedByLabel: input.actor.label,
        },
      });
      await emitAutomationEvent(
        documentRegisteredEvent,
        {
          documentId: document.id,
          direction: document.direction,
          hasDueDate: document.dueDate !== null,
        },
        tx,
      );
      return document;
    }),
  );

  const savedPaths: string[] = [];
  try {
    for (const file of validatedFiles) {
      const storedName = makeStoredName(file.extension);
      const storagePath = path.posix.join(String(created.year), created.id, storedName);
      await saveFile(storagePath, file.buffer);
      savedPaths.push(storagePath);
      await db.documentFile.create({
        data: {
          documentId: created.id,
          originalName: file.originalName,
          storedName,
          storagePath,
          mimeType: file.mimeType,
          size: file.size,
          uploadedById: input.actor.id,
          uploadedByLabel: input.actor.label,
        },
      });
    }
  } catch (error) {
    for (const p of savedPaths) {
      await removeFile(p).catch(() => undefined);
    }
    throw error;
  }

  await writeAudit({
    userId: input.actor.id,
    userLabel: input.actor.label,
    action: "CREATE",
    entity: "Document",
    entityId: created.id,
    after: {
      registryNumber: created.registryNumber,
      direction: created.direction,
      counterparty: created.counterparty,
      subject: created.subject,
      status: created.status,
      fileCount: validatedFiles.length,
      ...(input.auditMeta ?? {}),
    },
  });

  return {
    id: created.id,
    registryNumber: created.registryNumber,
    fileCount: validatedFiles.length,
  };
}
