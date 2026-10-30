"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { studentsPermissions } from "../permissions";
import {
  guardianLinkSchema,
  guardianUnlinkSchema,
  selfPayerSchema,
  studentDeleteSchema,
  studentSchema,
  studentUpdateSchema,
  type StudentInput,
} from "../schemas/student";
import { allocateDebtorNumber, allocateStudentNumber, withUniqueRetry } from "../services/numbers";
import { parseDateOnly, personName } from "../utils";

function studentData(input: StudentInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: parseDateOnly(input.birthDate),
    school: input.school || null,
    gradeLevel: input.gradeLevel || null,
    email: input.email ? input.email.toLowerCase() : null,
    phone: input.phone || null,
    status: input.status,
    photoConsent: input.photoConsent,
    dataConsentAt: parseDateOnly(input.dataConsentAt),
    note: input.note || null,
  };
}

export async function createStudentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "create" },
    schema: studentSchema,
    handler: async ({ input, user, audit }) => {
      const year = new Date().getUTCFullYear();
      const created = await withUniqueRetry(() =>
        getDb().$transaction(async (tx) => {
          const number = await allocateStudentNumber(tx, year);
          return tx.student.create({
            data: {
              ...studentData(input),
              ...number,
              createdById: user.id,
              createdByLabel: buildUserLabel(user.name, user.email),
            },
          });
        }),
      );
      await audit({ action: "CREATE", entity: "Student", entityId: created.id, after: { studentNumber: created.studentNumber } });
      return { id: created.id };
    },
  });
  return run(input);
}

export async function updateStudentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "update" },
    schema: studentUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.student.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new ActionError("students.errors.notFound");
      await db.student.update({ where: { id: existing.id }, data: studentData(input) });
      await audit({
        action: "UPDATE",
        entity: "Student",
        entityId: existing.id,
        before: { status: existing.status },
        after: { studentNumber: existing.studentNumber, status: input.status },
      });
      return { id: existing.id };
    },
  });
  return run(input);
}

/** Yumuşak silme: kurs kayıtlarındaki anlık görüntüler korunur. */
export async function deleteStudentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "delete" },
    schema: studentDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.student.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new ActionError("students.errors.notFound");
      await db.student.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      await audit({ action: "DELETE", entity: "Student", entityId: existing.id, before: { studentNumber: existing.studentNumber } });
      return { id: existing.id };
    },
  });
  return run(input);
}

/** Veli bağlar; ödeme sorumlusu seçilirse öğrencinin diğer bağlarındaki işaret kaldırılır. */
export async function linkGuardianAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "update" },
    schema: guardianLinkSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const [student, guardian] = await Promise.all([
        db.student.findFirst({ where: { id: input.studentId, deletedAt: null }, select: { id: true } }),
        db.studentGuardian.findFirst({ where: { id: input.guardianId, deletedAt: null }, select: { id: true } }),
      ]);
      if (!student) throw new ActionError("students.errors.notFound");
      if (!guardian) throw new ActionError("students.errors.guardianNotFound");
      await db.$transaction(async (tx) => {
        if (input.isPayer) {
          await tx.studentGuardianLink.updateMany({ where: { studentId: student.id }, data: { isPayer: false } });
        }
        await tx.studentGuardianLink.upsert({
          where: { studentId_guardianId: { studentId: student.id, guardianId: guardian.id } },
          create: { studentId: student.id, guardianId: guardian.id, relation: input.relation, isPayer: input.isPayer },
          update: { relation: input.relation, isPayer: input.isPayer },
        });
      });
      await audit({ action: "GUARDIAN_LINK", entity: "Student", entityId: student.id, after: { guardianId: guardian.id, relation: input.relation, isPayer: input.isPayer } });
      return { ok: true as const };
    },
  });
  return run(input);
}

export async function unlinkGuardianAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "update" },
    schema: guardianUnlinkSchema,
    handler: async ({ input, audit }) => {
      await getDb().studentGuardianLink.deleteMany({ where: { studentId: input.studentId, guardianId: input.guardianId } });
      await audit({ action: "GUARDIAN_UNLINK", entity: "Student", entityId: input.studentId, before: { guardianId: input.guardianId } });
      return { ok: true as const };
    },
  });
  return run(input);
}

/**
 * Yetişkin öğrenci kendi ödüyor: öğrencinin ad/iletişim bilgileriyle bir veli (Debitor) kaydı
 * açılır, "SELF" ilişkisiyle ödeme sorumlusu olarak bağlanır. Adres sonradan veli kaydında tamamlanır.
 */
export async function makeStudentSelfPayerAction(input: unknown): Promise<ActionResult<{ guardianId: string }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "update" },
    schema: selfPayerSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const student = await db.student.findFirst({ where: { id: input.studentId, deletedAt: null } });
      if (!student) throw new ActionError("students.errors.notFound");
      const existingSelf = await db.studentGuardianLink.findFirst({ where: { studentId: student.id, relation: "SELF" } });
      if (existingSelf) throw new ActionError("students.errors.selfPayerExists");
      const guardian = await withUniqueRetry(() =>
        db.$transaction(async (tx) => {
          const debtorNumber = await allocateDebtorNumber(tx);
          const created = await tx.studentGuardian.create({
            data: {
              debtorNumber,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              phone: student.phone,
              createdById: user.id,
              createdByLabel: buildUserLabel(user.name, user.email),
            },
          });
          await tx.studentGuardianLink.updateMany({ where: { studentId: student.id }, data: { isPayer: false } });
          await tx.studentGuardianLink.create({
            data: { studentId: student.id, guardianId: created.id, relation: "SELF", isPayer: true },
          });
          return created;
        }),
      );
      await audit({ action: "SELF_PAYER", entity: "Student", entityId: student.id, after: { guardian: personName(guardian), debtorNumber: guardian.debtorNumber } });
      return { guardianId: guardian.id };
    },
  });
  return run(input);
}
