import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { GuardianRow } from "../types";
import { personName } from "../utils";

export const GUARDIAN_SORTABLE_FIELDS = ["lastName", "debtorNumber", "updatedAt"] as const;
export const GUARDIAN_DEFAULT_SORT = "lastName";

function toRow(row: Prisma.StudentGuardianGetPayload<{ include: { _count: { select: { students: true } } } }>): GuardianRow {
  return {
    id: row.id,
    debtorNumber: row.debtorNumber,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    street: row.street,
    houseNumber: row.houseNumber,
    postalCode: row.postalCode,
    state: row.state,
    city: row.city,
    country: row.country,
    email: row.email,
    phone: row.phone,
    iban: row.iban,
    bic: row.bic,
    accountHolder: row.accountHolder,
    sepaMandateReference: row.sepaMandateReference,
    sepaMandateDate: row.sepaMandateDate,
    note: row.note,
    bulkMailOptOut: row.bulkMailOptOut,
    messagingConsents: row.messagingConsents,
    studentCount: row._count.students,
    updatedAt: row.updatedAt,
  };
}

export async function listGuardians(params: ListParams): Promise<ListResult<GuardianRow>> {
  const numeric = /^\d+$/.test(params.q) ? Number(params.q) : null;
  const where: Prisma.StudentGuardianWhereInput = {
    deletedAt: null,
    ...(params.q
      ? {
          OR: [
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
            { email: { contains: params.q, mode: "insensitive" } },
            { city: { contains: params.q, mode: "insensitive" } },
            ...(numeric !== null ? [{ debtorNumber: numeric }] : []),
          ],
        }
      : {}),
  };
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.studentGuardian.findMany({
      where,
      orderBy: params.sort === "lastName" ? [{ lastName: params.dir }, { firstName: params.dir }] : { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
      include: { _count: { select: { students: true } } },
    }),
    db.studentGuardian.count({ where }),
  ]);
  return { rows: rows.map(toRow), total, page: params.page, pageSize: params.pageSize };
}

export async function getGuardian(id: string): Promise<GuardianRow | null> {
  const row = await getDb().studentGuardian.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { students: true } } },
  });
  return row ? toRow(row) : null;
}

/** Veli seçim listesi (öğrenci detayında veli bağlama). */
export async function listGuardianOptions(): Promise<{ id: string; label: string }[]> {
  const rows = await getDb().studentGuardian.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, debtorNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((row) => ({ id: row.id, label: `${personName(row)} (${row.debtorNumber})` }));
}

/** DATEV Debitoren dışa aktarımı: silinmemiş tüm veliler, numara sırasıyla. */
export async function listGuardiansForDatev() {
  return getDb().studentGuardian.findMany({ where: { deletedAt: null }, orderBy: { debtorNumber: "asc" } });
}

export type GuardianContact = {
  id: string;
  studentId: string;
  isPayer: boolean;
  salutation: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  bulkMailOptOut: boolean;
  messagingConsents: string[];
};

/** Verilen öğrenciler için silinmemiş veli iletişim bilgilerini döndürür (kurs/toplu e-posta köprüsü). */
export async function listGuardianContactsForStudents(
  studentIds: string[],
  options?: { payerOnly?: boolean },
): Promise<GuardianContact[]> {
  const uniqueIds = Array.from(new Set(studentIds)).filter(Boolean);
  if (uniqueIds.length === 0) return [];
  const links = await getDb().studentGuardianLink.findMany({
    where: {
      studentId: { in: uniqueIds },
      ...(options?.payerOnly ? { isPayer: true } : {}),
      student: { deletedAt: null },
      guardian: { deletedAt: null },
    },
    include: {
      guardian: {
        select: {
          id: true,
          salutation: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          bulkMailOptOut: true,
          messagingConsents: true,
        },
      },
    },
    orderBy: [{ guardian: { lastName: "asc" } }, { guardian: { firstName: "asc" } }],
  });
  return links.map((link) => ({
    id: link.guardian.id,
    studentId: link.studentId,
    isPayer: link.isPayer,
    salutation: link.guardian.salutation,
    firstName: link.guardian.firstName,
    lastName: link.guardian.lastName,
    email: link.guardian.email,
    phone: link.guardian.phone,
    bulkMailOptOut: link.guardian.bulkMailOptOut,
    messagingConsents: link.guardian.messagingConsents,
  }));
}

