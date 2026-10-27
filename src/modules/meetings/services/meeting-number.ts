import "server-only";

import { Prisma } from "@prisma/client";

import { MEETING_NUMBER_PREFIX } from "../constants";

/** Eşzamanlı ilk kayıt yarışında P2002 için en fazla yeniden deneme sayısı (5. bölüm md. 1-2). */
const MAX_ATTEMPTS = 3;

/**
 * Toplantı numarası biçimi: TOP-<yıl>-<sıra> (TOP-2026-001).
 * Sıra 3 haneye sıfır dolgudur; 999'u aşarsa hane sayısı kendiliğinden artar.
 */
export function formatMeetingNumber(year: number, sequence: number): string {
  return `${MEETING_NUMBER_PREFIX}-${year}-${String(sequence).padStart(3, "0")}`;
}

/** Karar numarası biçimi: <yıl>/<sıra> (örnek 2026/7) (5. bölüm md. 2). */
export function formatDecisionNumber(year: number, sequence: number): string {
  return `${year}/${sequence}`;
}

/**
 * Toplantı numarası ayırma: yıl bazında atomik upsert (lastSeq +1); tür ayrımı
 * YOKTUR — sıra yıl içinde tüm toplantı türlerinde ortaktır (5. bölüm md. 1).
 * Mutlaka bir prisma.$transaction İÇİNDE çağrılmalıdır.
 */
export async function allocateMeetingNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<{ sequence: number; meetingNumber: string }> {
  const counter = await tx.meetingCounter.upsert({
    where: { kind_year: { kind: "MEETING", year } },
    update: { lastSeq: { increment: 1 } },
    create: { kind: "MEETING", year, lastSeq: 1 },
  });
  return {
    sequence: counter.lastSeq,
    meetingNumber: formatMeetingNumber(year, counter.lastSeq),
  };
}

/**
 * Karar numarası ayırma: yıl bazında atomik upsert; karar silinirse numara
 * serbest kalmaz, boşluk kabul edilir (5. bölüm md. 2).
 */
export async function allocateDecisionNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<{ sequence: number; decisionNumber: string }> {
  const counter = await tx.meetingCounter.upsert({
    where: { kind_year: { kind: "DECISION", year } },
    update: { lastSeq: { increment: 1 } },
    create: { kind: "DECISION", year, lastSeq: 1 },
  });
  return {
    sequence: counter.lastSeq,
    decisionNumber: formatDecisionNumber(year, counter.lastSeq),
  };
}

/**
 * Numara üretimi içeren işlemleri P2002 (benzersizlik ihlali) durumunda en fazla
 * MAX_ATTEMPTS kez yeniden dener; eşzamanlı ilk kayıtta numara tekrarı olmaz.
 */
export async function runWithNumberRetry<T>(attempt: () => Promise<T>): Promise<T> {
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
