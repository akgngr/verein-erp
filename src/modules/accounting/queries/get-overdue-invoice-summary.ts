import "server-only";

import { getDb } from "@/shared/db";

import { summarizeOverdueInvoices } from "../services/dashboard-overdue";

const PAGE_SIZE = 250;

/**
 * Bounded-memory overdue aggregation. Keeps exact per-invoice openCents semantics
 * while avoiding loading the full overdue invoice set into memory at once.
 */
export async function getOverdueInvoiceSummary(
  before: Date,
): Promise<{ count: number; cents: number }> {
  const db = getDb();
  let cursor: string | undefined;
  let total = { count: 0, cents: 0 };

  for (;;) {
    const page = await db.accountingInvoice.findMany({
      where: { kind: "INVOICE", status: "ISSUED", dueDate: { lt: before } },
      select: { id: true, grossCents: true, paidCents: true, skontoCents: true },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;

    const summary = summarizeOverdueInvoices(page);
    total = {
      count: total.count + summary.count,
      cents: total.cents + summary.cents,
    };
    cursor = page.at(-1)?.id;
    if (page.length < PAGE_SIZE || !cursor) break;
  }

  return total;
}
