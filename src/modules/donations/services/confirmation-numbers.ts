import "server-only";

import { Prisma } from "@prisma/client";

import { CONFIRMATION_NUMBER_PREFIX, DONATION_NUMBER_PREFIX, DONOR_NUMBER_PREFIX } from "../constants";

const MAX_ATTEMPTS = 3;

/** SP-0007 (yıl yok). */
export function formatDonorNumber(sequence: number): string {
  return `${DONOR_NUMBER_PREFIX}-${String(sequence).padStart(4, "0")}`;
}

/** BG-2026-0001. */
export function formatDonationNumber(year: number, sequence: number): string {
  return `${DONATION_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/** ZB-2026-0001 — üretim yılı bazlı, iptal edilen numaralar asla yeniden kullanılmaz. */
export function formatConfirmationNumber(year: number, sequence: number): string {
  return `${CONFIRMATION_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Sayaç ayırma (§ 11 md. 1): atomik upsert; mutlaka transaction İÇİNDE.
 * kind DONOR için year=0 sabittir.
 */
export async function allocateDonationsNumber(
  tx: Prisma.TransactionClient,
  kind: "DONOR" | "DONATION" | "CONFIRMATION",
  year: number,
): Promise<{ sequence: number }> {
  const counter = await tx.donationsCounter.upsert({
    where: { kind_year: { kind, year } },
    update: { lastSeq: { increment: 1 } },
    create: { kind, year, lastSeq: 1 },
  });
  return { sequence: counter.lastSeq };
}

/** P2002 (benzersizlik ihlali) yeniden deneme — üç sayaç için ortak. */
export async function runWithDonationsNumberRetry<T>(attempt: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attemptNo = 1; attemptNo <= MAX_ATTEMPTS; attemptNo += 1) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (isUniqueViolation && attemptNo < MAX_ATTEMPTS) continue;
      throw error;
    }
  }
  throw lastError;
}
