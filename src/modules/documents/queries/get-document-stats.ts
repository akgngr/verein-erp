import "server-only";

import { getDb } from "@/shared/db";

import type { DocumentStats } from "../types";
import { berlinMonthRange, berlinToday } from "../utils";

/**
 * Panel ve liste üstü istatistikler (9. bölüm): silinmemiş kayıtlar üzerinden.
 *
 * KARAR: "Bu ay gelen/giden" kayıt tarihi (registeredAt) bazlıdır — evrakın
 * deftere kaydedildiği ay esas alınır; Europe/Berlin takvim ayı kullanılır.
 */
export async function getDocumentStats(): Promise<DocumentStats> {
  const db = getDb();
  const today = berlinToday();
  const month = berlinMonthRange();

  const [open, inProgress, overdue, incomingThisMonth, outgoingThisMonth] = await Promise.all([
    db.document.count({ where: { deletedAt: null, status: "OPEN" } }),
    db.document.count({ where: { deletedAt: null, status: "IN_PROGRESS" } }),
    db.document.count({
      where: {
        deletedAt: null,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueDate: { lt: today },
      },
    }),
    db.document.count({
      where: {
        deletedAt: null,
        direction: "INCOMING",
        registeredAt: { gte: month.start, lt: month.end },
      },
    }),
    db.document.count({
      where: {
        deletedAt: null,
        direction: "OUTGOING",
        registeredAt: { gte: month.start, lt: month.end },
      },
    }),
  ]);

  return { open, inProgress, overdue, incomingThisMonth, outgoingThisMonth };
}
