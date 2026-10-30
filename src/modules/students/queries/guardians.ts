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
