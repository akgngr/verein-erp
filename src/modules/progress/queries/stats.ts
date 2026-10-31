import "server-only";

import { getDb } from "@/shared/db";

/** Son N gündeki devam durumu ve kayıt sayıları — yalnızca toplamlar (öğrenci adı yok). */
export async function getProgressStats(days = 30): Promise<{
  days: number;
  attendance: { present: number; late: number; absent: number; excused: number; ratePercent: number | null };
  assessments: number;
  notes: number;
}> {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const [rows, assessments, notes] = await Promise.all([
    db.progressAttendance.groupBy({ by: ["status"], where: { updatedAt: { gte: since } }, _count: true }),
    db.progressAssessment.count({ where: { date: { gte: since } } }),
    db.progressNote.count({ where: { date: { gte: since } } }),
  ]);
  const count = (status: string) => rows.find((row) => row.status === status)?._count ?? 0;
  const attended = count("PRESENT") + count("LATE");
  const counted = attended + count("ABSENT");
  return {
    days,
    attendance: { present: count("PRESENT"), late: count("LATE"), absent: count("ABSENT"), excused: count("EXCUSED"), ratePercent: counted ? Math.round((attended / counted) * 100) : null },
    assessments,
    notes,
  };
}
