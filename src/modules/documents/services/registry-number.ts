import "server-only";

import { Prisma } from "@prisma/client";

import { REGISTRY_PREFIX } from "../constants";

/** Eşzamanlı ilk kayıt yarışında P2002 için en fazla yeniden deneme sayısı (5. bölüm md. 1). */
const MAX_ATTEMPTS = 3;

/**
 * Kayıt numarası biçimi: GLN-<yıl>-0001 (gelen) / GDN-<yıl>-0001 (giden).
 * Sıra 4 haneye sıfır dolgudur; 9999'u aşarsa hane sayısı kendiliğinden artar.
 */
export function formatRegistryNumber(
  direction: "INCOMING" | "OUTGOING",
  year: number,
  sequence: number,
): string {
  return `${REGISTRY_PREFIX[direction]}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Sayaç ayırma: direction + year bazında atomik upsert (lastSeq +1).
 * Mutlaka bir prisma.$transaction İÇİNDE çağrılmalıdır; evrak kaydı aynı
 * transaction içinde oluşturulur (5. bölüm md. 1). Kayıt yılı, registeredAt'in
 * Europe/Berlin saatindeki yılıdır (utils.berlinYear).
 */
export async function allocateRegistryNumber(
  tx: Prisma.TransactionClient,
  direction: "INCOMING" | "OUTGOING",
  year: number,
): Promise<{ sequence: number; registryNumber: string }> {
  const counter = await tx.documentCounter.upsert({
    where: { direction_year: { direction, year } },
    update: { lastSeq: { increment: 1 } },
    create: { direction, year, lastSeq: 1 },
  });
  return {
    sequence: counter.lastSeq,
    registryNumber: formatRegistryNumber(direction, year, counter.lastSeq),
  };
}

/**
 * Evrak oluşturma işlemini P2002 (benzersizlik ihlali) durumunda en fazla
 * MAX_ATTEMPTS kez yeniden dener; eşzamanlı ilk kayıtta numara tekrarı olmaz.
 */
export async function runWithRegistryRetry<T>(attempt: () => Promise<T>): Promise<T> {
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
