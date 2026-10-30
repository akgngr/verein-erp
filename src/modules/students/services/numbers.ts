import "server-only";

import type { Prisma } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";

import { DEBTOR_NUMBER_MAX, DEBTOR_NUMBER_MIN, STUDENT_NUMBER_PREFIX } from "../constants";

/** Yıl bazında öğrenci sırası (atomik upsert): OGR-2026-0001. */
export async function allocateStudentNumber(tx: Prisma.TransactionClient, year: number) {
  const counter = await tx.studentsCounter.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  const sequence = counter.lastSeq;
  return { year, sequence, studentNumber: `${STUDENT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, "0")}` };
}

/**
 * Sıradaki DATEV Debitorennummer: ayarlardaki başlangıçtan büyük en yüksek numara + 1.
 * Benzersizlik @unique ile korunur; çakışmada (P2002) çağıran yeniden dener.
 */
export async function allocateDebtorNumber(tx: Prisma.TransactionClient): Promise<number> {
  const settings = await tx.studentsSettings.findUnique({ where: { id: "singleton" } });
  const start = settings?.debtorRangeStart ?? DEBTOR_NUMBER_MIN;
  const last = await tx.studentGuardian.findFirst({
    where: { debtorNumber: { gte: start } },
    orderBy: { debtorNumber: "desc" },
    select: { debtorNumber: true },
  });
  const next = last ? last.debtorNumber + 1 : start;
  if (next > DEBTOR_NUMBER_MAX) throw new ActionError("students.errors.debtorRangeExhausted");
  return next;
}

/** Benzersizlik çakışmasında (eşzamanlı kayıt) birkaç kez yeniden dener. */
export async function withUniqueRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== "P2002" || attempt >= attempts) throw error;
    }
  }
}
