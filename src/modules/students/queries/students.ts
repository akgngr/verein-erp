import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { StudentDetail, StudentOption, StudentPayer, StudentRow } from "../types";
import { personName } from "../utils";

export const STUDENT_SORTABLE_FIELDS = ["lastName", "studentNumber", "updatedAt"] as const;
export const STUDENT_DEFAULT_SORT = "lastName";
export type StudentListFilterKeys = "status";

export async function listStudents(params: ListParams<StudentListFilterKeys>): Promise<ListResult<StudentRow>> {
  const where: Prisma.StudentWhereInput = {
    deletedAt: null,
    ...(params.q
      ? {
          OR: [
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
            { studentNumber: { contains: params.q, mode: "insensitive" } },
            { school: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.filters.status === "ACTIVE" || params.filters.status === "INACTIVE" ? { status: params.filters.status } : {}),
  };
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.student.findMany({
      where,
      orderBy: params.sort === "lastName" ? [{ lastName: params.dir }, { firstName: params.dir }] : { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
      include: { guardians: { where: { isPayer: true }, include: { guardian: true } } },
    }),
    db.student.count({ where }),
  ]);
  return {
    rows: rows.map((row) => {
      const payer = row.guardians[0]?.guardian;
      return {
        id: row.id,
        studentNumber: row.studentNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate,
        school: row.school,
        gradeLevel: row.gradeLevel,
        status: row.status,
        payerLabel: payer ? personName(payer) : null,
        payerDebtorNumber: payer?.debtorNumber ?? null,
        updatedAt: row.updatedAt,
      };
    }),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getStudent(id: string): Promise<StudentDetail | null> {
  const row = await getDb().student.findFirst({
    where: { id, deletedAt: null },
    include: { guardians: { include: { guardian: true }, orderBy: [{ isPayer: "desc" }, { createdAt: "asc" }] } },
  });
  if (!row) return null;
  return {
    ...row,
    guardians: row.guardians.map((link) => ({
      guardianId: link.guardianId,
      relation: link.relation,
      isPayer: link.isPayer,
      name: personName(link.guardian),
      debtorNumber: link.guardian.debtorNumber,
      email: link.guardian.email,
      phone: link.guardian.phone,
    })),
  };
}

/** Seçim listeleri (kurs kaydı): aktif öğrenciler; `ids` verilirse yalnızca onlar. */
export async function listStudentOptions(options: { ids?: string[] } = {}): Promise<StudentOption[]> {
  const rows = await getDb().student.findMany({
    where: { deletedAt: null, ...(options.ids ? { id: { in: options.ids } } : { status: "ACTIVE" }) },
    select: { id: true, firstName: true, lastName: true, studentNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((row) => ({ id: row.id, label: personName(row), studentNumber: row.studentNumber }));
}

/** Öğrencinin ödeme sorumlusu (DATEV Debitor); yoksa null. */
export async function getStudentPayer(studentId: string): Promise<StudentPayer> {
  const link = await getDb().studentGuardianLink.findFirst({
    where: { studentId, isPayer: true, guardian: { deletedAt: null } },
    include: { guardian: true },
  });
  return link ? { guardianId: link.guardianId, label: personName(link.guardian), debtorNumber: link.guardian.debtorNumber } : null;
}
