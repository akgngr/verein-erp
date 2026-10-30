"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { progressPermissions } from "../permissions";
import {
  assessmentDeleteSchema,
  assessmentSchema,
  attendanceSchema,
  gradesSchema,
  noteDeleteSchema,
  noteSchema,
  parsePoints,
} from "../schemas/progress";
import { loadRosterFor } from "../services/access";

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Bir dersin yoklamasını toplu kaydeder (upsert). Yalnızca kurstaki oturum ve kayıtlar kabul edilir. */
export async function saveAttendanceAction(input: unknown): Promise<ActionResult<{ saved: number }>> {
  const run = createAction({
    permission: { definition: progressPermissions, action: "update" },
    schema: attendanceSchema,
    handler: async ({ input, user, audit }) => {
      const roster = await loadRosterFor(user, input.courseId);
      if (!roster.sessions.some((session) => session.id === input.sessionId)) throw new ActionError("progress.errors.sessionNotFound");
      const enrollmentIds = new Set(roster.enrollments.map((enrollment) => enrollment.id));
      const entries = input.entries.filter((entry) => enrollmentIds.has(entry.enrollmentId));
      const label = buildUserLabel(user.name, user.email);
      const db = getDb();
      await db.$transaction(
        entries.map((entry) =>
          db.progressAttendance.upsert({
            where: { sessionId_enrollmentId: { sessionId: input.sessionId, enrollmentId: entry.enrollmentId } },
            create: {
              courseId: input.courseId,
              sessionId: input.sessionId,
              enrollmentId: entry.enrollmentId,
              status: entry.status,
              note: entry.note || null,
              recordedById: user.id,
              recordedByLabel: label,
            },
            update: { status: entry.status, note: entry.note || null, recordedById: user.id, recordedByLabel: label },
          }),
        ),
      );
      await audit({ action: "ATTENDANCE", entity: "CourseSession", entityId: input.sessionId, after: { course: roster.course.code, saved: entries.length } });
      return { saved: entries.length };
    },
  });
  return run(input);
}

export async function createAssessmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: progressPermissions, action: "create" },
    schema: assessmentSchema,
    handler: async ({ input, user, audit }) => {
      const roster = await loadRosterFor(user, input.courseId);
      const created = await getDb().progressAssessment.create({
        data: { courseId: input.courseId, title: input.title, date: parseDate(input.date), type: input.type, maxPoints: parsePoints(input.maxPoints) },
      });
      await audit({ action: "ASSESSMENT_CREATE", entity: "ProgressAssessment", entityId: created.id, after: { course: roster.course.code, title: input.title } });
      return { id: created.id };
    },
  });
  return run(input);
}

export async function deleteAssessmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: progressPermissions, action: "delete" },
    schema: assessmentDeleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const assessment = await db.progressAssessment.findUnique({ where: { id: input.id } });
      if (!assessment) throw new ActionError("progress.errors.assessmentNotFound");
      await loadRosterFor(user, assessment.courseId);
      await db.progressAssessment.delete({ where: { id: assessment.id } });
      await audit({ action: "ASSESSMENT_DELETE", entity: "ProgressAssessment", entityId: assessment.id, before: { title: assessment.title } });
      return { id: assessment.id };
    },
  });
  return run(input);
}

/** Bir sınavın notlarını toplu kaydeder; tüm alanları boş olan satır silinir. */
export async function saveGradesAction(input: unknown): Promise<ActionResult<{ saved: number }>> {
  const run = createAction({
    permission: { definition: progressPermissions, action: "update" },
    schema: gradesSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const assessment = await db.progressAssessment.findUnique({ where: { id: input.assessmentId } });
      if (!assessment) throw new ActionError("progress.errors.assessmentNotFound");
      const roster = await loadRosterFor(user, assessment.courseId);
      const enrollmentIds = new Set(roster.enrollments.map((enrollment) => enrollment.id));
      const maxPoints = assessment.maxPoints === null ? null : Number(assessment.maxPoints);
      const operations = input.entries
        .filter((entry) => enrollmentIds.has(entry.enrollmentId))
        .map((entry) => {
          const points = parsePoints(entry.points);
          if (points !== null && maxPoints !== null && points > maxPoints) {
            throw new ActionError("progress.errors.pointsAboveMax", undefined, { max: maxPoints });
          }
          const key = { assessmentId_enrollmentId: { assessmentId: assessment.id, enrollmentId: entry.enrollmentId } };
          if (points === null && !entry.grade && !entry.comment) return db.progressGrade.deleteMany({ where: { assessmentId: assessment.id, enrollmentId: entry.enrollmentId } });
          const data = { points, grade: entry.grade || null, comment: entry.comment || null };
          return db.progressGrade.upsert({ where: key, create: { assessmentId: assessment.id, enrollmentId: entry.enrollmentId, ...data }, update: data });
        });
      await db.$transaction(operations);
      await audit({ action: "GRADES", entity: "ProgressAssessment", entityId: assessment.id, after: { course: roster.course.code, saved: operations.length } });
      return { saved: operations.length };
    },
  });
  return run(input);
}

export async function createNoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: progressPermissions, action: "create" },
    schema: noteSchema,
    handler: async ({ input, user, audit }) => {
      const roster = await loadRosterFor(user, input.courseId);
      if (!roster.enrollments.some((enrollment) => enrollment.id === input.enrollmentId)) throw new ActionError("progress.errors.enrollmentNotFound");
      const created = await getDb().progressNote.create({
        data: {
          courseId: input.courseId,
          enrollmentId: input.enrollmentId,
          date: parseDate(input.date),
          rating: input.rating ? Number(input.rating) : null,
          text: input.text,
          goals: input.goals || null,
          authorId: user.id,
          authorLabel: buildUserLabel(user.name, user.email),
        },
      });
      // Not içeriği kişisel veridir; denetim kaydına yazılmaz.
      await audit({ action: "NOTE_CREATE", entity: "ProgressNote", entityId: created.id, after: { course: roster.course.code } });
      return { id: created.id };
    },
  });
  return run(input);
}

/** Notu yalnızca yazan kişi ya da yönetici silebilir. */
export async function deleteNoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: progressPermissions, action: "delete" },
    schema: noteDeleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const note = await db.progressNote.findUnique({ where: { id: input.id } });
      if (!note) throw new ActionError("progress.errors.noteNotFound");
      await loadRosterFor(user, note.courseId);
      if (note.authorId !== user.id && user.role !== "ADMIN") throw new ActionError("progress.errors.noteNotYours");
      await db.progressNote.delete({ where: { id: note.id } });
      await audit({ action: "NOTE_DELETE", entity: "ProgressNote", entityId: note.id });
      return { id: note.id };
    },
  });
  return run(input);
}
