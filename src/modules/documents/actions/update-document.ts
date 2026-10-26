"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { documentsPermissions } from "../permissions";
import { documentUpdateSchema } from "../schemas/document";
import { validateAssignee, validateCategory, validateReplyTo } from "../services/validate-relations";
import { parseDateOnly } from "../utils";

const UPDATE_SCHEMA = documentUpdateSchema.extend({ id: z.string().min(1) });

/** Audit `changes` içine yansıtılacak alanlar (yalnızca değişenler, 11. bölüm). */
const TRACKED_FIELDS = [
  "documentDate",
  "counterparty",
  "referenceNumber",
  "subject",
  "summary",
  "deliveryMethod",
  "status",
  "dueDate",
  "categoryId",
  "assigneeId",
] as const;

type TrackedKey = (typeof TRACKED_FIELDS)[number];

function isoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Evrak güncelleme: yön ve kayıt numarası DEĞİŞTİRİLEMEZ (şemada yoktur).
 * Eşzamanlılık koruması (5. bölüm md. 6): formun taşıdığı updatedAt, veritabanı
 * değeriyle eşleşmezse anlamlı hata döner.
 */
export async function updateDocumentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; registryNumber: string }>> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "update" },
    schema: UPDATE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const doc = await db.document.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!doc) throw new ActionError("Evrak bulunamadı.");

      if (new Date(input.updatedAt).getTime() !== doc.updatedAt.getTime()) {
        throw new ActionError(
          "Bu kayıt başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.",
        );
      }

      const documentDate = parseDateOnly(input.documentDate);
      if (!documentDate) {
        throw new ActionError("Evrak tarihi geçersiz.", {
          documentDate: ["Geçerli bir evrak tarihi girin."],
        });
      }
      const dueDate = input.dueDate ? parseDateOnly(input.dueDate) : null;

      // KARAR: Doğrulamalar yalnızca alan değiştiğinde uygulanır (bkz. validate-relations).
      if (input.categoryId !== doc.categoryId) await validateCategory(input.categoryId);
      const assignee =
        input.assigneeId !== doc.assigneeId ? await validateAssignee(input.assigneeId) : null;
      if (input.replyToId !== doc.replyToId) {
        await validateReplyTo(input.replyToId, doc.direction, doc.id);
      }
      const assigneeId = input.assigneeId !== doc.assigneeId ? assignee?.id ?? null : doc.assigneeId;
      const assigneeLabel =
        input.assigneeId !== doc.assigneeId ? assignee?.label ?? null : doc.assigneeLabel;

      const status = input.status ?? doc.status;
      const updatedByLabel = buildUserLabel(user.name, user.email);

      const updated = await db.document.update({
        where: { id: doc.id },
        data: {
          documentDate,
          counterparty: input.counterparty,
          referenceNumber: input.referenceNumber,
          subject: input.subject,
          summary: input.summary,
          deliveryMethod: input.deliveryMethod,
          status,
          dueDate,
          categoryId: input.categoryId,
          assigneeId,
          assigneeLabel,
          updatedById: user.id,
          updatedByLabel,
        },
      });

      // Audit: before/after YALNIZCA değişen alanları içerir + registryNumber (11. bölüm).
      const previous: Record<string, unknown> = { registryNumber: doc.registryNumber };
      const next: Record<string, unknown> = { registryNumber: doc.registryNumber };
      const current: Record<TrackedKey, unknown> = {
        documentDate: isoDate(doc.documentDate),
        counterparty: doc.counterparty,
        referenceNumber: doc.referenceNumber,
        subject: doc.subject,
        summary: doc.summary,
        deliveryMethod: doc.deliveryMethod,
        status: doc.status,
        dueDate: isoDate(doc.dueDate),
        categoryId: doc.categoryId,
        assigneeId: doc.assigneeId,
      };
      const incoming: Record<TrackedKey, unknown> = {
        documentDate: isoDate(documentDate),
        counterparty: updated.counterparty,
        referenceNumber: updated.referenceNumber,
        subject: updated.subject,
        summary: updated.summary,
        deliveryMethod: updated.deliveryMethod,
        status: updated.status,
        dueDate: isoDate(updated.dueDate),
        categoryId: updated.categoryId,
        assigneeId: updated.assigneeId,
      };
      for (const field of TRACKED_FIELDS) {
        if (current[field] !== incoming[field]) {
          previous[field] = current[field];
          next[field] = incoming[field];
        }
      }

      await audit({
        action: "UPDATE",
        entity: "Document",
        entityId: updated.id,
        before: previous,
        after: next,
      });

      return { id: updated.id, registryNumber: updated.registryNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; registryNumber: string }>>;
}
