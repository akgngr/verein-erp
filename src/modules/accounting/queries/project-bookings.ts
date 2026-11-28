import "server-only";

import { getDb } from "@/shared/db";

/** Diğer modüller (hibeler) için: bir projenin dönemdeki geçerli fişleri (iptal ve virman hariç). */
export type ProjectBookingRow = {
  id: string;
  bookingNumber: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  categoryName: string | null;
  amountCents: number;
  netCents: number;
  description: string;
  counterparty: string | null;
  receiptReference: string | null;
  fileCount: number;
};

export async function listProjectBookings(projectId: string, from: Date, to: Date): Promise<ProjectBookingRow[]> {
  const rows = await getDb().accountingBooking.findMany({
    where: { projectId, reversedAt: null, type: { in: ["INCOME", "EXPENSE"] }, bookingDate: { gte: from, lte: to } },
    select: { id: true, bookingNumber: true, bookingDate: true, type: true, categoryId: true, category: { select: { name: true } }, amount: true, netAmount: true, description: true, counterparty: true, receiptReference: true, _count: { select: { files: { where: { deletedAt: null } } } } },
    orderBy: [{ bookingDate: "asc" }, { sequence: "asc" }],
    take: 5000,
  });
  return rows.map((row) => ({
    id: row.id,
    bookingNumber: row.bookingNumber,
    date: row.bookingDate.toISOString().slice(0, 10),
    type: row.type as "INCOME" | "EXPENSE",
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    netCents: Number(row.netAmount.mul(100).toFixed(0)),
    description: row.description,
    counterparty: row.counterparty,
    receiptReference: row.receiptReference,
    fileCount: row._count.files,
  }));
}

export type ProjectBookingFileRow = {
  bookingId: string;
  bookingNumber: string;
  date: string;
  originalName: string;
  storagePath: string;
};

/** Hibe Verwendungsnachweis belge paketi (ZIP) için proje gider fişlerinin silinmemiş ekleri. */
export async function listProjectBookingFiles(
  projectId: string,
  from: Date,
  to: Date,
): Promise<ProjectBookingFileRow[]> {
  const files = await getDb().accountingBookingFile.findMany({
    where: {
      deletedAt: null,
      booking: {
        projectId,
        reversedAt: null,
        type: "EXPENSE",
        bookingDate: { gte: from, lte: to },
      },
    },
    select: {
      bookingId: true,
      originalName: true,
      storagePath: true,
      booking: { select: { bookingNumber: true, bookingDate: true } },
    },
    orderBy: [{ booking: { bookingDate: "asc" } }, { createdAt: "asc" }],
    take: 5000,
  });
  return files.map((f) => ({
    bookingId: f.bookingId,
    bookingNumber: f.booking.bookingNumber,
    date: f.booking.bookingDate.toISOString().slice(0, 10),
    originalName: f.originalName,
    storagePath: f.storagePath,
  }));
}
