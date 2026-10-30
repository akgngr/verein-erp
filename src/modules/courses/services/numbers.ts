import "server-only";

import type { Prisma } from "@prisma/client";

import { COURSE_CODE_PREFIX } from "../constants";

/** Yıl bazında kurs sırası (atomik upsert): K-2026-001. */
export async function allocateCourseCode(tx: Prisma.TransactionClient, year: number) {
  const counter = await tx.coursesCounter.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return { year, sequence: counter.lastSeq, code: `${COURSE_CODE_PREFIX}-${year}-${String(counter.lastSeq).padStart(3, "0")}` };
}
