import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import { berlinToday } from "../utils";
import { decimalToCents } from "../services/dues-calculation";
import type { DuesReportRow } from "../types";

/** URL'deki filter.* anahtarları. */
export type DuesListFilterKeys = "status" | "type" | "year";

/**
 * Sıralanabilir alanlar. KARAR: "paidAmount" sıralanamaz — ödenen tutar
 * denormalize edilmediğinden DB sıralaması yoktur (bkz. şema karar notu).
 */
export const DUES_SORTABLE_FIELDS = [
  "membershipNumber",
  "lastName",
  "amountDue",
  "dueDate",
  "status",
] as const;

export const DUES_DEFAULT_SORT = "lastName";

const STATUS_VALUES = ["OPEN", "PARTIAL", "PAID", "WAIVED"] as const;

/**
 * Rapor where'i — rapor ve dışa aktarım TEK BURADAN where üretir.
 * Silinmiş üyelerin satırları her koşulda dışarıda bırakılır.
 */
export function buildDuesWhere(
  params: ListParams<DuesListFilterKeys>,
  year: number,
): Prisma.MemberDueWhereInput {
  const conditions: Prisma.MemberDueWhereInput[] = [
    { year, member: { deletedAt: null } },
  ];

  if (params.q) {
    conditions.push({
      member: {
        OR: [
          { membershipNumber: { contains: params.q, mode: "insensitive" } },
          { firstName: { contains: params.q, mode: "insensitive" } },
          { lastName: { contains: params.q, mode: "insensitive" } },
        ],
      },
    });
  }

  if (params.filters.type) {
    conditions.push({
      member: { type: params.filters.type as Prisma.EnumMembershipTypeFilter["equals"] },
    });
  }

  const status = params.filters.status;
  if (status === "OVERDUE") {
    // Gecikmiş: PAID/WAIVED değil ve son ödeme tarihi geçmiş (Europe/Berlin).
    conditions.push({
      status: { in: ["OPEN", "PARTIAL"] },
      dueDate: { lt: berlinToday() },
    });
  } else if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
    conditions.push({ status: status as Prisma.EnumMemberDueStatusFilter["equals"] });
  }

  return { AND: conditions };
}

const DUES_SELECT = {
  id: true,
  year: true,
  amountDue: true,
  status: true,
  dueDate: true,
  member: {
    select: {
      id: true,
      membershipNumber: true,
      firstName: true,
      lastName: true,
      type: true,
    },
  },
} satisfies Prisma.MemberDueSelect;

type DueRowDb = Prisma.MemberDueGetPayload<{ select: typeof DUES_SELECT }>;

/** Sayfa satırlarının ödeme toplamları: (memberId, dueYear) üzerinden. */
async function loadPaymentSums(
  rows: DueRowDb[],
  year: number,
): Promise<{ paidByMember: Map<string, number>; lastPaymentByMember: Map<string, string> }> {
  const memberIds = [...new Set(rows.map((row) => row.member.id))];
  const paidByMember = new Map<string, number>();
  const lastPaymentByMember = new Map<string, string>();
  if (memberIds.length === 0) return { paidByMember, lastPaymentByMember };

  const payments = await getDb().memberPayment.findMany({
    where: {
      dueYear: year,
      voidedAt: null,
      memberId: { in: memberIds },
    },
    select: { memberId: true, amount: true, paidAt: true },
  });

  for (const payment of payments) {
    const cents = decimalToCents(payment.amount);
    paidByMember.set(payment.memberId, (paidByMember.get(payment.memberId) ?? 0) + cents);
    const iso = payment.paidAt.toISOString().slice(0, 10);
    const prev = lastPaymentByMember.get(payment.memberId);
    if (!prev || iso > prev) lastPaymentByMember.set(payment.memberId, iso);
  }

  return { paidByMember, lastPaymentByMember };
}

function toReportRow(
  row: DueRowDb,
  paidCents: number,
  lastPaymentAt: string | null,
  today: Date,
): DuesReportRow {
  const amountDueCents = decimalToCents(row.amountDue);
  return {
    id: row.id,
    memberId: row.member.id,
    membershipNumber: row.member.membershipNumber,
    fullName: `${row.member.firstName} ${row.member.lastName}`,
    type: row.member.type,
    year: row.year,
    amountDueCents,
    paidCents,
    remainingCents: Math.max(0, amountDueCents - paidCents),
    status: row.status,
    dueDate: row.dueDate.toISOString().slice(0, 10),
    overdue:
      row.status !== "PAID" &&
      row.status !== "WAIVED" &&
      row.dueDate.getTime() < today.getTime(),
    lastPaymentAt,
  };
}

/** Aidat raporu: sayfalı liste (Faz 3 eklemeleri). */
export async function listDues(
  params: ListParams<DuesListFilterKeys>,
  year: number,
): Promise<ListResult<DuesReportRow>> {
  const where = buildDuesWhere(params, year);
  const db = getDb();

  const [rows, total] = await Promise.all([
    db.memberDue.findMany({
      where,
      select: DUES_SELECT,
      orderBy: buildOrderBy(params),
      skip: params.skip,
      take: params.take,
    }),
    db.memberDue.count({ where }),
  ]);

  const { paidByMember, lastPaymentByMember } = await loadPaymentSums(rows, year);
  const today = berlinToday();

  return {
    rows: rows.map((row) =>
      toReportRow(row, paidByMember.get(row.member.id) ?? 0, lastPaymentByMember.get(row.member.id) ?? null, today),
    ),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

/** Excel dışa aktarımı: aynı where + sıralama, sayfalama yok. */
export async function listDuesForExport(
  params: ListParams<DuesListFilterKeys>,
  year: number,
  maxRows: number,
): Promise<DuesReportRow[]> {
  const where = buildDuesWhere(params, year);
  const rows = await getDb().memberDue.findMany({
    where,
    select: DUES_SELECT,
    orderBy: buildOrderBy(params),
    take: maxRows,
  });
  const { paidByMember, lastPaymentByMember } = await loadPaymentSums(rows, year);
  const today = berlinToday();
  return rows.map((row) =>
    toReportRow(row, paidByMember.get(row.member.id) ?? 0, lastPaymentByMember.get(row.member.id) ?? null, today),
  );
}

function buildOrderBy(
  params: ListParams<DuesListFilterKeys>,
): Prisma.MemberDueOrderByWithRelationInput {
  switch (params.sort) {
    case "membershipNumber":
      return { member: { membershipNumber: params.dir } };
    case "lastName":
      return { member: { lastName: params.dir } };
    default:
      return { [params.sort]: params.dir } as Prisma.MemberDueOrderByWithRelationInput;
  }
}
