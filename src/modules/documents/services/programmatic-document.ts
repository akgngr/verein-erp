import "server-only";

import path from "node:path";
import type { DeliveryMethod, DocumentDirection, DocumentStatus } from "@prisma/client";

import { writeAudit } from "@/shared/audit/write-audit";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { makeStoredName, removeFile, saveFile, validateUpload } from "@/shared/files";

import { documentRegisteredEvent } from "../automation";
import { ALLOWED_EXTENSIONS, DEFAULT_STATUS_BY_DIRECTION, MAX_FILES_PER_DOCUMENT } from "../constants";
import { allocateRegistryNumber, runWithRegistryRetry } from "./registry-number";
import { berlinYear } from "../utils";

export interface ProgrammaticDocumentFileInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer | Uint8Array;
}

export interface CreateDocumentWithFilesInput {
  direction: DocumentDirection;
  documentDate: Date;
  counterparty: string;
  subject: string;
  summary?: string | null;
  referenceNumber?: string | null;
  deliveryMethod?: DeliveryMethod | null;
  status?: DocumentStatus;
  files?: ProgrammaticDocumentFileInput[];
  actor: { id: string; label: string };
}

export interface CreateDocumentWithFilesResult {
  id: string;
  registryNumber: string;
  attachedCount: number;
  skippedFiles: string[];
}

/** Pure input sanitizer shared with unit tests (enforces DB column bounds and safe fallbacks). */
export function normalizeProgrammaticDocumentInput(input: {
  counterparty: string;
  subject: string;
  summary?: string | null;
  referenceNumber?: string | null;
  documentDate: Date;
}) {
  const counterparty = input.counterparty.trim().slice(0, 200) || "—";
  const subject = input.subject.trim().slice(0, 200) || "—";
  const summary = input.summary?.trim() ? input.summary.trim().slice(0, 2000) : null;
  const referenceNumber = input.referenceNumber?.trim()
    ? input.referenceNumber.trim().slice(0, 100)
    : null;
  // Normalize to date-only UTC midnight so @db.Date matches manual document entries.
  const iso = input.documentDate.toISOString().slice(0, 10);
  const documentDate = new Date(`${iso}T00:00:00.000Z`);
  return { counterparty, subject, summary, referenceNumber, documentDate };
}

/**
 * Programmatically registers a Document (allocating GLN/GDN-YYYY-NNNN) and attaches
 * validated files into UPLOAD_DIR + DocumentFile. Intended for cross-module bridges
 * (e.g., Mail → Documents, Meetings minutes archival) after the caller has checked
 * module availability and `documents.create` permission.
 */
export async function createDocumentWithFiles(
  input: CreateDocumentWithFilesInput,
): Promise<CreateDocumentWithFilesResult> {
  const db = getDb();
  const normalized = normalizeProgrammaticDocumentInput(input);
  const status = input.status ?? DEFAULT_STATUS_BY_DIRECTION[input.direction];
  const registeredAt = new Date();
  const year = berlinYear(registeredAt);

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
          documentDate: normalized.documentDate,
          counterparty: normalized.counterparty,
          referenceNumber: normalized.referenceNumber,
          subject: normalized.subject,
          summary: normalized.summary,
          deliveryMethod: input.deliveryMethod ?? null,
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
          hasDueDate: false,
        },
        tx,
      );
      return document;
    }),
  );

  await writeAudit({
    userId: input.actor.id,
    userLabel: input.actor.label,
    action: "CREATE",
    entity: "Document",
    entityId: created.id,
    after: {
      registryNumber: created.registryNumber,
      direction: created.direction,
      status: created.status,
      deliveryMethod: created.deliveryMethod,
    },
  });

  const maxBytes = getEnv().MAX_UPLOAD_MB * 1024 * 1024;
  const skippedFiles: string[] = [];
  let attachedCount = 0;

  for (const file of input.files ?? []) {
    if (attachedCount >= MAX_FILES_PER_DOCUMENT) {
      skippedFiles.push(file.originalName);
      continue;
    }
    const buf = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
    const validation = validateUpload({
      file: {
        originalName: file.originalName,
        declaredMime: file.mimeType,
        size: buf.length,
        head: buf.subarray(0, 64),
      },
      allowedExtensions: ALLOWED_EXTENSIONS,
      maxBytes,
    });
    if (!validation.ok) {
      skippedFiles.push(file.originalName);
      continue;
    }

    const storedName = makeStoredName(validation.file.extension);
    const storagePath = path.posix.join(String(created.year), created.id, storedName);
    await saveFile(storagePath, buf);
    try {
      const saved = await db.documentFile.create({
        data: {
          documentId: created.id,
          originalName: validation.file.originalName,
          storedName,
          storagePath,
          mimeType: validation.file.mimeType,
          size: validation.file.size,
          uploadedById: input.actor.id,
          uploadedByLabel: input.actor.label,
        },
      });
      attachedCount += 1;
      await writeAudit({
        userId: input.actor.id,
        userLabel: input.actor.label,
        action: "FILE_UPLOAD",
        entity: "DocumentFile",
        entityId: saved.id,
        after: {
          registryNumber: created.registryNumber,
          size: saved.size,
        },
      });
    } catch (error) {
      await removeFile(storagePath);
      throw error;
    }
  }

  return {
    id: created.id,
    registryNumber: created.registryNumber,
    attachedCount,
    skippedFiles,
  };
}
