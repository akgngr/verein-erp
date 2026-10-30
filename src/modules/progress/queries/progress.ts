import "server-only";

import { getDb } from "@/shared/db";

import type { AssessmentRow, AttendanceMap, AttendanceSummary, NoteRow } from "../types";

export async function getAttendanceMap(courseId: string): Promise<AttendanceMap> {
  const rows = await getDb().progressAttendance.findMany({ where: { courseId } });
  const map: AttendanceMap = {};
  for (const row of rows) {
    (map[row.sessionId] ??= {})[row.enrollmentId] = { status: row.status, note: row.note };
  }
  return map;
}

/** Devam oranı = (katıldı + geç) / kaydedilen ders (iptal dersler dahil edilmez; mazeretli sayılmaz). */
export function summarizeAttendance(map: AttendanceMap, enrollmentIds: string[], activeSessionIds: string[]): AttendanceSummary[] {
  return enrollmentIds.map((enrollmentId) => {
    const summary = { enrollmentId, present: 0, late: 0, excused: 0, absent: 0, recorded: 0, rate: null as number | null };
    for (const sessionId of activeSessionIds) {
      const entry = map[sessionId]?.[enrollmentId];
      if (!entry) continue;
      summary.recorded++;
      if (entry.status === "PRESENT") summary.present++;
      else if (entry.status === "LATE") summary.late++;
      else if (entry.status === "EXCUSED") summary.excused++;
      else summary.absent++;
    }
    const counted = summary.recorded - summary.excused;
    summary.rate = counted > 0 ? Math.round(((summary.present + summary.late) / counted) * 100) : null;
    return summary;
  });
}

export async function listAssessments(courseId: string): Promise<AssessmentRow[]> {
  const rows = await getDb().progressAssessment.findMany({
    where: { courseId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { grades: true },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    type: row.type,
    maxPoints: row.maxPoints === null ? null : Number(row.maxPoints),
    grades: Object.fromEntries(
      row.grades.map((grade) => [
        grade.enrollmentId,
        { points: grade.points === null ? null : Number(grade.points), grade: grade.grade, comment: grade.comment },
      ]),
    ),
  }));
}

export async function listNotes(courseId: string, enrollmentId?: string): Promise<NoteRow[]> {
  const rows = await getDb().progressNote.findMany({
    where: { courseId, ...(enrollmentId ? { enrollmentId } : {}) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    enrollmentId: row.enrollmentId,
    date: row.date,
    rating: row.rating,
    text: row.text,
    goals: row.goals,
    authorId: row.authorId,
    authorLabel: row.authorLabel,
  }));
}
