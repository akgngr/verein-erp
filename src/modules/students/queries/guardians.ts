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

export interface GuardianContactRecord {
  id: string;
  salutation: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  bulkMailOptOut: boolean;
  messagingConsents: string[];
}

/**
 * Batch-fetches active, non-deleted guardian contacts and their student links
 * for cross-module recipient resolution (e.g., courses → mailings campaigns).
 */
export async function listGuardianContactsForStudents(
  studentIds: string[],
  extraGuardianIds: string[] = [],
): Promise<{
  guardiansById: Map<string, GuardianContactRecord>;
  linksByStudentId: Map<string, Array<{ guardianId: string; isPayer: boolean }>>;
}> {
  const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];
  const uniqueExtraIds = [...new Set(extraGuardianIds.filter(Boolean))];
  if (uniqueStudentIds.length === 0 && uniqueExtraIds.length === 0) {
    return { guardiansById: new Map(), linksByStudentId: new Map() };
  }

  const db = getDb();
  const links = uniqueStudentIds.length
    ? await db.studentGuardianLink.findMany({
        where: {
          studentId: { in: uniqueStudentIds },
          student: { deletedAt: null },
          guardian: { deletedAt: null },
        },
        select: { studentId: true, guardianId: true, isPayer: true },
      })
    : [];

  const linksByStudentId = new Map<string, Array<{ guardianId: string; isPayer: boolean }>>();
  const guardianIdSet = new Set<string>(uniqueExtraIds);
  for (const link of links) {
    guardianIdSet.add(link.guardianId);
    const list = linksByStudentId.get(link.studentId) ?? [];
    list.push({ guardianId: link.guardianId, isPayer: link.isPayer });
    linksByStudentId.set(link.studentId, list);
  }

  if (guardianIdSet.size === 0) {
    return { guardiansById: new Map(), linksByStudentId };
  }

  const guardians = await db.studentGuardian.findMany({
    where: { id: { in: [...guardianIdSet] }, deletedAt: null },
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
  });

  const guardiansById = new Map<string, GuardianContactRecord>();
  for (const row of guardians) {
    guardiansById.set(row.id, row);
  }

  return { guardiansById, linksByStudentId };
}
