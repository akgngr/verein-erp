"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { courseSessionsPermissions } from "../permissions";
import { sessionDeleteSchema, sessionSchema, sessionSeriesSchema, sessionUpdateSchema, type SessionInput } from "../schemas/course";
import { canAccessCourse } from "../services/teacher-scope";
import { parseDateOnly } from "../utils";

function sessionData(input: SessionInput) {
  return {
    date: parseDateOnly(input.date)!,
    startTime: input.startTime || null,
    endTime: input.endTime || null,
    topic: input.topic || null,
    teacherId: input.teacherId || null,
    isCancelled: input.isCancelled,
    note: input.note || null,
  };
}

async function assertCourse(user: { id: string; role: Parameters<typeof canAccessCourse>[0]["role"] }, courseId: string) {
  const course = await getDb().course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true, code: true } });
  if (!course || !(await canAccessCourse(user, course.id))) throw new ActionError("courses.errors.notFound");
  return course;
}

export async function createSessionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: courseSessionsPermissions, action: "create" },
    schema: sessionSchema,
    handler: async ({ input, user, audit }) => {
      const course = await assertCourse(user, input.courseId);
      const created = await getDb().courseSession.create({ data: { courseId: course.id, ...sessionData(input) } });
      await audit({ action: "SESSION_CREATE", entity: "CourseSession", entityId: created.id, after: { course: course.code, date: input.date } });
      return { id: created.id };
    },
  });
  return run(input);
}

export async function updateSessionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: courseSessionsPermissions, action: "update" },
    schema: sessionUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.courseSession.findUnique({ where: { id: input.id } });
      if (!existing || existing.courseId !== input.courseId) throw new ActionError("courses.errors.sessionNotFound");
      const course = await assertCourse(user, existing.courseId);
      await db.courseSession.update({ where: { id: existing.id }, data: sessionData(input) });
      await audit({ action: "SESSION_UPDATE", entity: "CourseSession", entityId: existing.id, after: { course: course.code, date: input.date, cancelled: input.isCancelled } });
      return { id: existing.id };
    },
  });
  return run(input);
}

export async function deleteSessionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: courseSessionsPermissions, action: "delete" },
    schema: sessionDeleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.courseSession.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("courses.errors.sessionNotFound");
      const course = await assertCourse(user, existing.courseId);
      await db.courseSession.delete({ where: { id: existing.id } });
      await audit({ action: "SESSION_DELETE", entity: "CourseSession", entityId: existing.id, before: { course: course.code, date: existing.date } });
      return { id: existing.id };
    },
  });
  return run(input);
}

/**
 * Haftalık seri: kursun başlangıç–bitiş aralığında seçilen hafta gününe oturum ekler
 * (aynı gün zaten varsa atlanır). Bitiş tarihi yoksa 12 hafta.
 */
export async function createSessionSeriesAction(input: unknown): Promise<ActionResult<{ created: number }>> {
  const run = createAction({
    permission: { definition: courseSessionsPermissions, action: "create" },
    schema: sessionSeriesSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      await assertCourse(user, input.courseId);
      const course = await db.course.findUniqueOrThrow({ where: { id: input.courseId }, select: { id: true, code: true, startDate: true, endDate: true } });
      const existing = new Set((await db.courseSession.findMany({ where: { courseId: course.id }, select: { date: true } })).map((s) => s.date.toISOString()));
      const end = course.endDate ?? new Date(course.startDate.getTime() + 12 * 7 * 86_400_000);
      const target = input.weekday % 7; // 1=Pzt … 7=Paz → JS getUTCDay (0=Paz)
      const dates: Date[] = [];
      for (let day = new Date(course.startDate); day <= end && dates.length < 104; day = new Date(day.getTime() + 86_400_000)) {
        if (day.getUTCDay() === target && !existing.has(day.toISOString())) dates.push(day);
      }
      if (dates.length === 0) throw new ActionError("courses.errors.seriesEmpty");
      await db.courseSession.createMany({
        data: dates.map((date) => ({ courseId: course.id, date, startTime: input.startTime || null, endTime: input.endTime || null })),
      });
      await audit({ action: "SESSION_SERIES", entity: "Course", entityId: course.id, after: { course: course.code, created: dates.length } });
      return { created: dates.length };
    },
  });
  return run(input);
}
