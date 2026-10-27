import "server-only";

import { Prisma } from "@prisma/client";

import { BOOKING_NUMBER_PREFIX } from "../constants";

const MAX_ATTEMPTS = 3;

/** Fiş numarası biçimi: B-<yıl>-0001 (§ 8 md. 2). */
export function formatBookingNumber(year: number, sequence: number): string {
  return `${BOOKING_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Fiş numarası ayırma: yıl bazında atomik upsert (lastSeq +1). Mutlaka bir
 * prisma.$transaction İÇİNDE çağrılmalıdır; fiş aynı transaction içinde
 * oluşturulur (§ 8 md. 2 — sıra giriş sırasını yansıtır, asla yeniden kullanılmaz).
 */
export async function allocateBookingNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<{ sequence: number; bookingNumber: string }> {
  const counter = await tx.accountingCounter.upsert({
    where: { year },
    update: { lastSeq: { increment: 1 } },
    create: { year, lastSeq: 1 },
  });
  return {
    sequence: counter.lastSeq,
    bookingNumber: formatBookingNumber(year, counter.lastSeq),
  };
}

/** Fiş oluşturma işlemini P2002 (benzersizlik ihlali) durumunda yeniden dener. */
export async function runWithBookingNumberRetry<T>(attempt: () => Promise<T>): Promise<T> {
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
