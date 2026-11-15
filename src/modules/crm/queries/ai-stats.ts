import "server-only";
import {getDb} from "@/shared/db";
export async function dealStageTotals() {
  const rows = await getDb().crmDeal.groupBy({ by: ["stage"], _count: { _all: true }, _sum: { amountCents: true } });
  return Object.fromEntries(rows.map((row) => [row.stage, { count: row._count._all, amount: (row._sum.amountCents ?? 0) / 100 }]));
}
