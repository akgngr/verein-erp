import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/shared/db";

import { type ParsedTransaction, transactionKey } from "./bank-parsers";

/**
 * Banka hareketlerini içe aktarır (dosya ekstresi veya banka bağlantısı): hash ile mükerrerler
 * atlanır, satırlar "Banka" eşleştirme ekranına OPEN olarak düşer. Hiçbir fiş otomatik YAZILMAZ.
 * format: CAMT053 | MT940 | CSV | API (banka bağlantısı).
 */
export async function importBankTransactions(input: {
  accountId: string;
  format: string;
  fileName: string;
  rows: ParsedTransaction[];
  actor: { id: string; label: string };
}): Promise<{ importId: string; total: number; created: number }> {
  const db = getDb();
  const rows = input.rows.map((row) => ({
    ...row,
    hash: createHash("sha256").update(transactionKey(input.accountId, row)).digest("hex"),
  }));
  const existing = new Set(
    (await db.accountingBankTransaction.findMany({ where: { hash: { in: rows.map((row) => row.hash) } }, select: { hash: true } })).map((row) => row.hash),
  );
  // Aynı partide birebir aynı iki satır: ikinciye sıra eki (gerçekten iki ayrı ödeme olabilir).
  const seen = new Map<string, number>();
  const fresh = rows
    .map((row) => {
      const count = seen.get(row.hash) ?? 0;
      seen.set(row.hash, count + 1);
      return count ? { ...row, hash: `${row.hash}:${count}` } : row;
    })
    .filter((row) => !existing.has(row.hash));
  const created = await db.accountingBankImport.create({
    data: {
      accountId: input.accountId,
      format: input.format,
      fileName: input.fileName,
      totalCount: rows.length,
      newCount: fresh.length,
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
      transactions: {
        create: fresh.map((row) => ({
          accountId: input.accountId,
          hash: row.hash,
          bookingDate: new Date(`${row.bookingDate}T00:00:00Z`),
          valueDate: row.valueDate ? new Date(`${row.valueDate}T00:00:00Z`) : null,
          amountCents: row.amountCents,
          currency: row.currency,
          counterpartyName: row.counterpartyName?.slice(0, 200) ?? null,
          counterpartyIban: row.counterpartyIban?.slice(0, 34) ?? null,
          purpose: row.purpose.slice(0, 500),
          reference: row.reference?.slice(0, 100) ?? null,
        })),
      },
    },
    select: { id: true },
  });
  return { importId: created.id, total: rows.length, created: fresh.length };
}
