import "server-only";

import { getDb } from "@/shared/db";

import type { ReturnEvent } from "../lib/mandate-health";
import type { Candidate, Source } from "./runs";

/**
 * Debtor key for return history: member dues keep the member id across years ("<memberId>:<year>"); course
 * charges are per charge, so the guardian's mandate reference identifies the debtor.
 */
export function debtorKey(source: Source, item: Pick<Candidate, "sourceKey" | "mandateReference">): string {
  return source === "MEMBER_DUES" ? `m:${item.sourceKey.split(":")[0]}` : `r:${item.mandateReference ?? item.sourceKey}`;
}

/** SEPA's own history for the candidates: last collection per mandate and returns per debtor. Reads only sepa tables. */
export async function loadMandateHistory(source: Source, list: Pick<Candidate, "sourceKey" | "mandateReference">[]) {
  const references = [...new Set(list.map((item) => item.mandateReference).filter((value): value is string => Boolean(value)))];
  const db = getDb();
  const [collected, returned] = await Promise.all([
    references.length
      ? db.sepaDebitItem.findMany({ where: { mandateReference: { in: references }, status: { in: ["COLLECTED", "RETURNED"] }, run: { collectedAt: { not: null } } }, select: { mandateReference: true, status: true, run: { select: { collectedAt: true } } } })
      : Promise.resolve([]),
    db.sepaDebitItem.findMany({
      where: { status: "RETURNED", run: { source }, OR: [{ mandateReference: { in: references } }, { sourceKey: { in: list.map((item) => item.sourceKey) } }, ...(source === "MEMBER_DUES" ? [...new Set(list.map((item) => item.sourceKey.split(":")[0]))].map((memberId) => ({ sourceKey: { startsWith: `${memberId}:` } })) : [])] },
      select: { sourceKey: true, mandateReference: true, returnCode: true, returnFeeCents: true, returnedAt: true, run: { select: { collectedAt: true } } },
      take: 5000,
    }),
  ]);
  const lastCollected = new Map<string, Date>();
  for (const row of collected) {
    // A returned item was still collected first; the mandate counts as used on the collection date.
    const at = row.run.collectedAt;
    if (at && (!lastCollected.has(row.mandateReference) || lastCollected.get(row.mandateReference)! < at)) lastCollected.set(row.mandateReference, at);
  }
  const returnsByDebtor = new Map<string, ReturnEvent[]>();
  for (const row of returned) {
    const key = debtorKey(source, row);
    const at = row.returnedAt ?? row.run.collectedAt;
    if (!at) continue;
    returnsByDebtor.set(key, [...(returnsByDebtor.get(key) ?? []), { code: row.returnCode, at, feeCents: row.returnFeeCents }]);
  }
  return {
    for: (item: Pick<Candidate, "sourceKey" | "mandateReference">) => ({
      lastCollectedAt: item.mandateReference ? lastCollected.get(item.mandateReference) ?? null : null,
      returns: returnsByDebtor.get(debtorKey(source, item)) ?? [],
    }),
  };
}
