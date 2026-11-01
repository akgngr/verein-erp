import "server-only";

import { getDb } from "@/shared/db";

import type { BookingDetail } from "../types";

/** Fiş detayı (§ 11.3): tüm alanlar + dosyalar (yumuşak silinmişler hariç). */
export async function getBooking(id: string): Promise<BookingDetail | null> {
  const db = getDb();
  const row = await db.accountingBooking.findUnique({
    where: { id },
    include: {
      account: { select: { name: true } },
      counterAccount: { select: { name: true } },
      category: { select: { name: true, sphere: true } },
      project: { select: { name: true } },
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
    },
  });
  if (!row) return null;

  const fileCount = row.files.length;
  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    type: row.type,
    bookingDate: row.bookingDate,
    accountName: row.account.name,
    transferLine:
      row.type === "TRANSFER" ? `${row.account.name} → ${row.counterAccount?.name ?? "-"}` : null,
    categoryName: row.category?.name ?? null,
    categorySphere: row.category?.sphere ?? null,
    project: row.project?.name ?? null,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    description: row.description,
    counterparty: row.counterparty,
    receiptReference: row.receiptReference,
    fileCount,
    hasReceipt: fileCount > 0 || row.type === "TRANSFER" || row.sourceType !== null,
    reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
    reverseReason: row.reverseReason,
    sourceType: row.sourceType,
    taxRate: row.taxRate,
    netCents: Number(row.netAmount.mul(100).toFixed(0)),
    taxCents: Number(row.taxAmount.mul(100).toFixed(0)),
    year: row.year,
    sequence: row.sequence,
    accountId: row.accountId,
    counterAccountId: row.counterAccountId,
    categoryId: row.categoryId,
    projectId: row.projectId,
    createdAt: row.createdAt,
    createdById: row.createdById,
    createdByLabel: row.createdByLabel,
    updatedByLabel: row.updatedByLabel,
    updatedAt: row.updatedAt,
    files: row.files,
  };
}
