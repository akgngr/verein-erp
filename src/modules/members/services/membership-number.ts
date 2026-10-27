import "server-only";

import { Prisma } from "@prisma/client";

import { MEMBERSHIP_NUMBER_PREFIX } from "../constants";

/** Eşzamanlı ilk kayıt yarışında P2002 için en fazla yeniden deneme sayısı. */
const MAX_ATTEMPTS = 3;

/**
 * Üyelik numarası biçimi: UYE-<yıl>-0001. Sıra 4 haneye sıfır dolgudur; 9999'u
 * aşarsa hane sayısı kendiliğinden artar.
 */
export function formatMembershipNumber(year: number, sequence: number): string {
  return `${MEMBERSHIP_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Sayaç ayırma: yıl bazında atomik upsert (lastSeq +1). Mutlaka bir
 * prisma.$transaction İÇİNDE çağrılmalıdır; üye kaydı aynı transaction içinde
 * oluşturulur. Kayıt yılı, kayıt anı (now) yılını kullanır — tıpkı evrak
 * registeredAt kalıbı gibi (istisnai olarak üyenin katılım yılını değil).
 *
 * KARAR: Üyelik numarası kayıt yılına göre üretilir (joinDate'e göre değil).
 * Çünkü kayıt defteri o yıl başlanıldığını gösterir; katılım tarihi farklı
 * bir yıldan bile olabilir (geç kayıt). Numara yine de tekildir çünkü sayaç
 * yıl bazında artar ve üye tablosunda @@unique([year, sequence]) yatar.
 */
export async function allocateMembershipNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<{ sequence: number; membershipNumber: string }> {
  const counter = await tx.memberCounter.upsert({
    where: { year },
    update: { lastSeq: { increment: 1 } },
    create: { year, lastSeq: 1 },
  });
  return {
    sequence: counter.lastSeq,
    membershipNumber: formatMembershipNumber(year, counter.lastSeq),
  };
}

/** Üye oluşturma işlemini P2002 (benzersizlik ihlali) durumunda en fazla MAX_ATTEMPTS kez yeniden dener. */
export async function runWithMembershipNumberRetry<T>(attempt: () => Promise<T>): Promise<T> {
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
