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
    select: { id: true, bookingNumber: true, bookingDate: true, type: true, categoryId: true, category: { select: { name: true } }, amount: true, netAmount: true, description: true, counterparty: true, receiptReference: true, _count: { select: { files: true } } },
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
