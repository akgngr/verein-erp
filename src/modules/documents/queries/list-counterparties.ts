import "server-only";

import { getDb } from "@/shared/db";

import type { CounterpartyOption } from "../types";

/**
 * Otomatik tamamlama (8.2): daha önce kullanılan kurum/kişi adları.
 * Silinmemiş evraklardan distinct olarak alınır; ada göre sıralıdır.
 */
export async function listCounterparties(q: string, limit = 20): Promise<CounterpartyOption[]> {
  const rows = await getDb().document.findMany({
    where: {
      deletedAt: null,
      ...(q ? { counterparty: { contains: q, mode: "insensitive" } } : {}),
    },
    distinct: ["counterparty"],
    select: { counterparty: true },
    orderBy: { counterparty: "asc" },
    take: limit,
  });
  return rows.map((row) => ({ value: row.counterparty }));
}
