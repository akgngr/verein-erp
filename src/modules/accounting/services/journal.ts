import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

/**
 * ACC-7 GoBD değişmez günlük (Journal): her fiş oluşturma / değişiklik / iptal olayı, fişin o
 * anki tam görüntüsüyle birlikte zincirlenmiş SHA-256 ile eklenir. Tablo yalnızca eklenebilir
 * (DB tetikleyicisi UPDATE/DELETE'i reddeder). Doğrulama: zincir sürekliliği + her fişin son
 * olayının mevcut durumla aynı olması.
 */
export type JournalEvent = "CREATE" | "UPDATE" | "REVERSE" | "SEAL";

export const GENESIS_HASH = "0".repeat(64);

const BOOKING_SNAPSHOT_SELECT = {
  id: true,
  bookingNumber: true,
  year: true,
  sequence: true,
  type: true,
  bookingDate: true,
  accountId: true,
  counterAccountId: true,
  categoryId: true,
  projectId: true,
  amount: true,
  taxRate: true,
  netAmount: true,
  taxAmount: true,
  description: true,
  counterparty: true,
  receiptReference: true,
  sourceType: true,
  sourceId: true,
  reversedAt: true,
  reverseReason: true,
  createdAt: true,
} as const;

type SnapshotRow = Prisma.AccountingBookingGetPayload<{ select: typeof BOOKING_SNAPSHOT_SELECT }>;

/** Sabit anahtar sıralı, tip-normalize görüntü (Decimal → "12.34", Date → ISO). */
export function bookingSnapshot(row: SnapshotRow): Record<string, string | number | null> {
  const value = (input: unknown) => (input === null || input === undefined ? null : input instanceof Date ? input.toISOString() : typeof input === "object" ? String(input) : (input as string | number));
  const keys = Object.keys(BOOKING_SNAPSHOT_SELECT).sort();
  return Object.fromEntries(keys.map((key) => [key, value((row as Record<string, unknown>)[key])]));
}

export function canonicalJson(value: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((acc, key) => ((acc[key] = value[key]), acc), {}));
}

export function chainHash(prevHash: string, entry: { seq: number; bookingId: string; event: string; snapshotHash: string; createdAt: string }): string {
  return createHash("sha256").update([prevHash, entry.seq, entry.bookingId, entry.event, entry.snapshotHash, entry.createdAt].join("|")).digest("hex");
}

export function snapshotHash(snapshot: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

/** Fiş(ler) için günlük olayı ekler — çağıranın transaction'ı İÇİNDE, yazmadan hemen sonra. */
export async function recordJournal(tx: Prisma.TransactionClient, bookingIds: string[], event: JournalEvent, actor: { id: string; label: string } | null): Promise<void> {
  if (!bookingIds.length) return;
  // Zincir sırası için tek yazar: transaction süresince danışma kilidi.
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('accounting_journal'))");
  const rows = await tx.accountingBooking.findMany({ where: { id: { in: bookingIds } }, select: BOOKING_SNAPSHOT_SELECT, orderBy: [{ year: "asc" }, { sequence: "asc" }] });
  let last = await tx.accountingJournal.findFirst({ orderBy: { seq: "desc" }, select: { seq: true, hash: true } });
  for (const row of rows) {
    const snapshot = bookingSnapshot(row);
    const seq = (last?.seq ?? 0) + 1;
    const createdAt = new Date();
    const entry = { seq, bookingId: row.id, event, snapshotHash: snapshotHash(snapshot), createdAt: createdAt.toISOString() };
    const hash = chainHash(last?.hash ?? GENESIS_HASH, entry);
    await tx.accountingJournal.create({
      data: { seq, bookingId: row.id, bookingNumber: row.bookingNumber, event, snapshot, snapshotHash: entry.snapshotHash, prevHash: last?.hash ?? GENESIS_HASH, hash, actorId: actor?.id ?? null, actorLabel: actor?.label ?? null, createdAt },
    });
    last = { seq, hash };
  }
}

export type JournalProblem =
  | { kind: "brokenChain"; seq: number }
  | { kind: "gap"; seq: number }
  | { kind: "snapshotMismatch"; seq: number; bookingNumber: string }
  | { kind: "modifiedAfterJournal"; bookingNumber: string }
  | { kind: "unjournaled"; bookingNumber: string };

/** Saf doğrulama (test edilebilir). */
export function verifyJournal(
  entries: Array<{ seq: number; bookingId: string; bookingNumber: string; event: string; snapshot: Record<string, unknown>; snapshotHash: string; prevHash: string; hash: string; createdAt: Date }>,
  current: Map<string, { bookingNumber: string; snapshot: Record<string, unknown> }>,
): JournalProblem[] {
  const problems: JournalProblem[] = [];
  let prev = GENESIS_HASH;
  let expectedSeq = 1;
  const latest = new Map<string, Record<string, unknown>>();
  for (const entry of entries) {
    if (entry.seq !== expectedSeq) problems.push({ kind: "gap", seq: entry.seq });
    expectedSeq = entry.seq + 1;
    if (snapshotHash(entry.snapshot) !== entry.snapshotHash) problems.push({ kind: "snapshotMismatch", seq: entry.seq, bookingNumber: entry.bookingNumber });
    const expected = chainHash(prev, { seq: entry.seq, bookingId: entry.bookingId, event: entry.event, snapshotHash: entry.snapshotHash, createdAt: entry.createdAt.toISOString() });
    if (entry.prevHash !== prev || entry.hash !== expected) problems.push({ kind: "brokenChain", seq: entry.seq });
    prev = entry.hash;
    latest.set(entry.bookingId, entry.snapshot);
  }
  for (const [bookingId, state] of current) {
    const journaled = latest.get(bookingId);
    if (!journaled) problems.push({ kind: "unjournaled", bookingNumber: state.bookingNumber });
    else if (canonicalJson(journaled) !== canonicalJson(state.snapshot)) problems.push({ kind: "modifiedAfterJournal", bookingNumber: state.bookingNumber });
  }
  return problems;
}

export { BOOKING_SNAPSHOT_SELECT };
