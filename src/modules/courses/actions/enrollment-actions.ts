"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";
import { getStudentPayer, listStudentOptions } from "@/modules/students/server";

import { coursesPermissions } from "../permissions";
import { enrollmentStatusSchema, enrollSchema } from "../schemas/enrollment";
import { planCharges } from "../services/charge-plan";
import { parseDateOnly } from "../utils";

/**
 * Öğrencileri kursa kaydeder ve ücretli kursta ödeme planını oluşturur. Ödeme sorumlusu
 * (DATEV Debitor) kayıt anında anlık görüntü olarak alınır; ücretli kursta zorunludur.
 */
export async function enrollStudentsAction(input: unknown): Promise<ActionResult<{ enrolled: number }>> {
  const run = createAction({
    permission: { definition: coursesPermissions, action: "update" },
    schema: enrollSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const course = await db.course.findFirst({ where: { id: input.courseId, deletedAt: null } });
      if (!course) throw new ActionError("courses.errors.notFound");
      if (course.status === "COMPLETED" || course.status === "CANCELLED") throw new ActionError("courses.errors.courseClosed");

      const enrolledAt = parseDateOnly(input.enrolledAt)!;
      const students = await listStudentOptions({ ids: input.studentIds });
      if (students.length !== new Set(input.studentIds).size) throw new ActionError("courses.errors.studentNotFound");
      const already = new Set(
        (await db.courseEnrollment.findMany({ where: { courseId: course.id, studentId: { in: input.studentIds } }, select: { studentId: true } })).map(
          (row) => row.studentId,
        ),
      );
      const fresh = students.filter((student) => !already.has(student.id));
      if (fresh.length === 0) throw new ActionError("courses.errors.alreadyEnrolled");

      if (course.capacity) {
        const active = await db.courseEnrollment.count({ where: { courseId: course.id, status: "ACTIVE" } });
        if (active + fresh.length > course.capacity) {
          throw new ActionError("courses.errors.capacityExceeded", undefined, { capacity: course.capacity, free: Math.max(course.capacity - active, 0) });
        }
      }

      const payers = new Map(await Promise.all(fresh.map(async (student) => [student.id, await getStudentPayer(student.id)] as const)));
      if (course.feeType !== "FREE" && input.discountPercent < 100) {
        const missing = fresh.filter((student) => !payers.get(student.id));
        if (missing.length > 0) {
          throw new ActionError("courses.errors.payerMissing", undefined, { names: missing.map((student) => student.label).join(", ") });
        }
      }

      const actorLabel = buildUserLabel(user.name, user.email);
      await db.$transaction(async (tx) => {
        for (const student of fresh) {
          const payer = payers.get(student.id) ?? null;
          const plan = planCharges({
            feeType: course.feeType,
            feeCents: course.feeCents,
            installmentCount: course.installmentCount,
            discountPercent: input.discountPercent,
            enrolledAt,
            courseStart: course.startDate,
            courseEnd: course.endDate,
          });
          await tx.courseEnrollment.create({
            data: {
              courseId: course.id,
              studentId: student.id,
              studentLabel: student.label,
              studentNumber: student.studentNumber,
              payerGuardianId: payer?.guardianId ?? null,
              payerLabel: payer?.label ?? null,
              payerDebtorNumber: payer?.debtorNumber ?? null,
              enrolledAt,
              discountPercent: input.discountPercent,
              createdById: user.id,
              createdByLabel: actorLabel,
              charges: { create: plan },
            },
          });
        }
      });
      await audit({ action: "ENROLL", entity: "Course", entityId: course.id, after: { course: course.code, enrolled: fresh.length } });
      return { enrolled: fresh.length };
    },
  });
  return run(input);
}

/** Kayıt durumu. Ayrılınca (WITHDRAWN) açık ücret kalemleri iptal edilir; ödenmişler korunur. */
export async function setEnrollmentStatusAction(input: unknown): Promise<ActionResult<{ cancelledCharges: number }>> {
  const run = createAction({
    permission: { definition: coursesPermissions, action: "update" },
    schema: enrollmentStatusSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const enrollment = await db.courseEnrollment.findUnique({ where: { id: input.id }, include: { course: { select: { code: true } } } });
      if (!enrollment) throw new ActionError("courses.errors.enrollmentNotFound");
      const result = await db.$transaction(async (tx) => {
        await tx.courseEnrollment.update({ where: { id: enrollment.id }, data: { status: input.status } });
        if (input.status !== "WITHDRAWN") return { count: 0 };
        return tx.courseCharge.updateMany({ where: { enrollmentId: enrollment.id, status: "OPEN" }, data: { status: "CANCELLED" } });
      });
      await audit({
        action: "ENROLLMENT_STATUS",
        entity: "CourseEnrollment",
        entityId: enrollment.id,
        before: { status: enrollment.status },
        after: { course: enrollment.course.code, student: enrollment.studentNumber, status: input.status, cancelledCharges: result.count },
      });
      return { cancelledCharges: result.count };
    },
  });
  return run(input);
}
