"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { coursesPermissions } from "../permissions";
import { courseDeleteSchema, courseSchema, courseUpdateSchema, type CourseInput } from "../schemas/course";
import { allocateCourseCode } from "../services/numbers";
import { parseDateOnly, parseEuroToCents } from "../utils";

function courseData(input: CourseInput) {
  const free = input.feeType === "FREE";
  return {
    kind: input.kind,
    title: input.title,
    subject: input.subject || null,
    description: input.description || null,
    level: input.level || null,
    location: input.location || null,
    scheduleNote: input.scheduleNote || null,
    startDate: parseDateOnly(input.startDate)!,
    endDate: parseDateOnly(input.endDate),
    capacity: input.capacity ? Number(input.capacity) : null,
    feeType: input.feeType,
    feeCents: free ? 0 : (parseEuroToCents(input.fee) ?? 0),
    installmentCount: input.feeType === "INSTALLMENTS" ? Number(input.installmentCount) : null,
    status: input.status,
  };
}

async function assertTeachersExist(ids: string[]) {
  if (ids.length === 0) return;
  const count = await getDb().courseTeacher.count({ where: { id: { in: ids } } });
  if (count !== new Set(ids).size) throw new ActionError("courses.errors.teacherNotFound");
}

export async function createCourseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: coursesPermissions, action: "create" },
    schema: courseSchema,
    handler: async ({ input, user, audit }) => {
      await assertTeachersExist(input.teacherIds);
      const data = courseData(input);
      const created = await getDb().$transaction(async (tx) => {
        const number = await allocateCourseCode(tx, data.startDate.getUTCFullYear());
        return tx.course.create({
          data: {
            ...data,
            ...number,
            createdById: user.id,
            createdByLabel: buildUserLabel(user.name, user.email),
            teachers: { create: [...new Set(input.teacherIds)].map((teacherId) => ({ teacherId })) },
          },
        });
      });
      await audit({ action: "CREATE", entity: "Course", entityId: created.id, after: { code: created.code, title: created.title } });
      return { id: created.id };
    },
  });
  return run(input);
}

/**
 * Güncelleme. KARAR: ücret değişikliği mevcut kayıtların ödeme planını değiştirmez
 * (yalnızca yeni kayıtlar etkilenir); böylece tahsil edilmiş kalemler tutarlı kalır.
 */
export async function updateCourseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: coursesPermissions, action: "update" },
    schema: courseUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.course.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new ActionError("courses.errors.notFound");
      await assertTeachersExist(input.teacherIds);
      await db.$transaction([
        db.course.update({ where: { id: existing.id }, data: courseData(input) }),
        db.courseTeacherLink.deleteMany({ where: { courseId: existing.id } }),
        db.courseTeacherLink.createMany({ data: [...new Set(input.teacherIds)].map((teacherId) => ({ courseId: existing.id, teacherId })) }),
      ]);
      await audit({
        action: "UPDATE",
        entity: "Course",
        entityId: existing.id,
        before: { status: existing.status, feeCents: existing.feeCents },
        after: { code: existing.code, status: input.status },
      });
      return { id: existing.id };
    },
  });
  return run(input);
}

/** Silme yalnızca tahsilat yapılmamış kurslarda (muhasebe izi korunur); aksi hâlde "İptal" durumu kullanılır. */
export async function deleteCourseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: coursesPermissions, action: "delete" },
    schema: courseDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.course.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new ActionError("courses.errors.notFound");
      const payments = await db.coursePayment.count({ where: { charge: { enrollment: { courseId: existing.id } } } });
      if (payments > 0) throw new ActionError("courses.errors.deleteHasPayments");
      await db.course.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      await audit({ action: "DELETE", entity: "Course", entityId: existing.id, before: { code: existing.code } });
      return { id: existing.id };
    },
  });
  return run(input);
}
