import "server-only";

import type { MeetingType } from "@prisma/client";

import { getDb } from "@/shared/db";

import type { CopySourceOption } from "../types";

/**
 * "Önceki toplantıdan kopyala" kaynakları (7.2): aynı türden, silinmemiş,
 * son 10 toplantı; listede numara – başlık – tarih gösterilir (5. bölüm md. 11).
 */
export async function listCopySources(type: MeetingType): Promise<CopySourceOption[]> {
  const db = getDb();
  return db.meeting.findMany({
    where: { deletedAt: null, type },
    orderBy: [{ meetingDate: "desc" }, { sequence: "desc" }],
    take: 10,
    select: { id: true, meetingNumber: true, title: true, meetingDate: true },
  });
}
