import "server-only";

import type { DocumentStatus } from "@prisma/client";

import { getDb } from "@/shared/db";

import type { DocumentDetail } from "../types";
import { berlinToday, isDocumentOverdue } from "../utils";

/**
 * Detay sorgusu (8.3): dosyalar (yalnızca aktif), notlar (en yeni üstte),
 * yanıtlanan evrak ve bu evrağa verilen yanıtlar dahil edilir.
 * Kayıt yok ya da silinmişse null döner; view notFound() çağırır.
 */
export async function getDocumentDetail(id: string): Promise<DocumentDetail | null> {
  const row = await getDb().document.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      direction: true,
      registryNumber: true,
      registeredAt: true,
      documentDate: true,
      counterparty: true,
      referenceNumber: true,
      subject: true,
      summary: true,
      deliveryMethod: true,
      status: true,
      dueDate: true,
      categoryId: true,
      category: { select: { name: true } },
      assigneeId: true,
      assigneeLabel: true,
      createdById: true,
      createdByLabel: true,
      createdAt: true,
      updatedById: true,
      updatedByLabel: true,
      updatedAt: true,
      replyTo: {
        select: { id: true, registryNumber: true, counterparty: true, subject: true },
      },
      replies: {
        where: { deletedAt: null },
        orderBy: { registeredAt: "asc" },
        select: {
          id: true,
          registryNumber: true,
          counterparty: true,
          subject: true,
          status: true,
        },
      },
      files: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          uploadedByLabel: true,
          createdAt: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, body: true, authorLabel: true, createdAt: true },
      },
    },
  });

  if (!row) return null;

  const today = berlinToday();
  const isOverdue = isDocumentOverdue(row.status as DocumentStatus, row.dueDate, today);

  return {
    ...row,
    status: row.status as DocumentStatus,
    categoryName: row.category?.name ?? null,
    isOverdue,
  };
}
