import "server-only";

import { Prisma } from "@prisma/client";

/** Makbuz numarası öneki: MAK-<yıl>-0001 (KARAR: Quittungs-Nr. için MAK). */
export const RECEIPT_NUMBER_PREFIX = "MAK";

const MAX_ATTEMPTS = 3;

/** Makbuz numarası biçimi: MAK-<yıl>-0001. Sıra 4 haneye sıfır dolgudur. */
export function formatReceiptNumber(year: number, sequence: number): string {
  return `${RECEIPT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Makbuz numarası ayırma: yıl bazında atomik upsert (lastSeq +1). Mutlaka bir
 * prisma.$transaction İÇİNDE çağrılmalıdır; ödeme kaydı aynı transaction içinde
 * oluşturulur. Yıl, ödeme tarihindeki (paidAt) Berlin yılıdır.
 */
export async function allocateReceiptNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<{ sequence: number; receiptNumber: string }> {
  const counter = await tx.memberPaymentCounter.upsert({
    where: { year },
    update: { lastSeq: { increment: 1 } },
    create: { year, lastSeq: 1 },
  });
  return {
    sequence: counter.lastSeq,
    receiptNumber: formatReceiptNumber(year, counter.lastSeq),
  };
}

/** Ödeme oluşturma işlemini P2002 (benzersizlik ihlali) durumunda yeniden dener. */
export async function runWithReceiptNumberRetry<T>(attempt: () => Promise<T>): Promise<T> {
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
