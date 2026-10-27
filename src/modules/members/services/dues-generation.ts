import "server-only";

import { centsToDecimalString } from "@/shared/money";
import { getDb } from "@/shared/db";

import { decimalToCents } from "./dues-calculation";

/**
 * Yıllık aidat üretimi (Faz 3 eklemeleri — iş emri § 5 md. 6 uyarlandı).
 *
 * Uygunluk: silinmemiş + AKTİF üye, joinDate ≤ yıl sonu, türünün yıllık aidat
 * tutarı > 0, o yıl için aidat satırı yok. KARAR: türün pasif olması üretimi
 * engellemez (pasif tür yalnız yeni üye kaydını etkiler; mevcut üyeler aidatlıdır).
 */

export type DuesGenerationPreview = {
  year: number;
  eligibleCount: number;
  totalAmountCents: number;
  /** Aidat tutarı belirsiz/0 olan türdeki üye sayısı. */
  skippedNoAmountCount: number;
  /** O yıl için zaten aidat satırı olan üye sayısı. */
  skippedExistingCount: number;
};

function yearEnd(year: number): Date {
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59));
}

/** Üretim öncesi önizleme (yazma yok) — toplu üretim ile AYNI kurallar. */
export async function getDuesGenerationPreview(
  year: number,
): Promise<DuesGenerationPreview> {
  const db = getDb();

  const [configs, existing, candidates] = await Promise.all([
    db.membershipTypeConfig.findMany(),
    db.memberDue.findMany({ where: { year }, select: { memberId: true } }),
    db.member.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        joinDate: { lte: yearEnd(year) },
      },
      select: { id: true, type: true },
    }),
  ]);

  return summarize(year, configs, existing, candidates);
}

type ConfigRow = { type: "ASIL" | "ONURSAL" | "FAHRI" | "DESTEKCI"; annualDue: unknown };
type CandidateRow = { id: string; type: "ASIL" | "ONURSAL" | "FAHRI" | "DESTEKCI" };

function summarize(
  year: number,
  configs: ConfigRow[],
  existing: Array<{ memberId: string }>,
  candidates: CandidateRow[],
): DuesGenerationPreview {
  const amountByType = new Map<string, number>();
  for (const config of configs) {
    amountByType.set(config.type, decimalToCents(config.annualDue as never));
  }

  const existingIds = new Set(existing.map((row) => row.memberId));

  let eligibleCount = 0;
  let totalAmountCents = 0;
  let skippedNoAmountCount = 0;
  let skippedExistingCount = 0;

  for (const candidate of candidates) {
    if (existingIds.has(candidate.id)) {
      skippedExistingCount += 1;
      continue;
    }
    const cents = amountByType.get(candidate.type) ?? 0;
    if (!(cents > 0)) {
      skippedNoAmountCount += 1;
      continue;
    }
    eligibleCount += 1;
    totalAmountCents += cents;
  }

  return { year, eligibleCount, totalAmountCents, skippedNoAmountCount, skippedExistingCount };
}

/**
 * Toplu üretim: transaction içinde aynı uygunluk kuralları; @@unique([memberId,
 * year]) yarışı da kısıtla garanti edilir. Uygunluk sorguları transaction
 * içinde yeniden çalıştırılır (önizleme ile sonuç arası değişiklik emniyeti).
 */
export async function generateDues(args: {
  year: number;
  dueDate: Date;
  userId: string;
  userLabel: string;
}): Promise<{ created: number; totalAmountCents: number }> {
  const db = getDb();

  return db.$transaction(async (tx) => {
    const [configs, existing, candidates] = await Promise.all([
      tx.membershipTypeConfig.findMany(),
      tx.memberDue.findMany({ where: { year: args.year }, select: { memberId: true } }),
      tx.member.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          joinDate: { lte: yearEnd(args.year) },
        },
        select: { id: true, type: true },
      }),
    ]);

    const amountByType = new Map<string, number>();
    for (const config of configs) {
      amountByType.set(config.type, decimalToCents(config.annualDue));
    }
    const existingIds = new Set(existing.map((row) => row.memberId));

    let created = 0;
    let totalAmountCents = 0;

    for (const candidate of candidates) {
      if (existingIds.has(candidate.id)) continue;
      const cents = amountByType.get(candidate.type) ?? 0;
      if (!(cents > 0)) continue;

      await tx.memberDue.create({
        data: {
          memberId: candidate.id,
          year: args.year,
          amountDue: centsToDecimalString(cents),
          dueDate: args.dueDate,
          status: "OPEN",
          createdById: args.userId,
          createdByLabel: args.userLabel,
        },
      });
      created += 1;
      totalAmountCents += cents;
    }

    return { created, totalAmountCents };
  });
}
