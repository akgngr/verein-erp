import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { MemberListItem } from "../types";

/** URL'deki filter.* anahtarları. */
export type MemberListFilterKeys =
  | "status"
  | "type"
  | "from"
  | "to";

/** Sıralanabilir alanlar ve varsayılan sıralama. */
export const MEMBER_SORTABLE_FIELDS = [
  "membershipNumber",
  "firstName",
  "lastName",
  "joinDate",
  "status",
  "type",
] as const;

export const MEMBER_DEFAULT_SORT = "membershipNumber";

/**
 * Filtre oluşturucu — liste ve dışa aktarım TEK BURADAN where üretir.
 * Silinmiş kayıtlar (deletedAt != null) her koşulda dışarıda bırakılır.
 */
export function buildMemberWhere(
  params: ListParams<MemberListFilterKeys>,
): Prisma.MemberWhereInput {
  const conditions: Prisma.MemberWhereInput[] = [{ deletedAt: null }];

  if (params.q) {
    conditions.push({
      OR: [
        { membershipNumber: { contains: params.q, mode: "insensitive" } },
        { firstName: { contains: params.q, mode: "insensitive" } },
        { lastName: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
        { phone: { contains: params.q, mode: "insensitive" } },
        { kimlikNo: { contains: params.q, mode: "insensitive" } },
        { profession: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  if (params.filters.status) {
    conditions.push({ status: params.filters.status as Prisma.EnumMemberStatusFilter["equals"] });
  }

  if (params.filters.type) {
    conditions.push({ type: params.filters.type as Prisma.EnumMembershipTypeFilter["equals"] });
  }

  // Katılım tarihi aralığı (joinDate, @db.Date).
  const dateRange: Prisma.DateTimeFilter = {};
  if (params.filters.from && /^\d{4}-\d{2}-\d{2}$/.test(params.filters.from)) {
    dateRange.gte = new Date(`${params.filters.from}T00:00:00.000Z`);
  }
  if (params.filters.to && /^\d{4}-\d{2}-\d{2}$/.test(params.filters.to)) {
    const to = new Date(`${params.filters.to}T00:00:00.000Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    dateRange.lt = to;
  }
  if (dateRange.gte || dateRange.lt) {
    conditions.push({ joinDate: dateRange });
  }

  return { AND: conditions };
}

const MEMBER_SELECT = {
  id: true,
  membershipNumber: true,
  type: true,
  status: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  street: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  state: true,
  joinDate: true,
  exitDate: true,
  country: true,
} satisfies Prisma.MemberSelect;

type MemberRow = Prisma.MemberGetPayload<{ select: typeof MEMBER_SELECT }>;

function toListItem(row: MemberRow): MemberListItem {
  return {
    id: row.id,
    membershipNumber: row.membershipNumber,
    type: row.type,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    email: row.email,
    phone: row.phone,
    street: row.street,
    houseNumber: row.houseNumber,
    postalCode: row.postalCode,
    city: row.city,
    state: row.state,
    joinDate: row.joinDate,
    exitDate: row.exitDate,
    country: row.country,
  };
}

function orderBy(
  params: ListParams<MemberListFilterKeys>,
): Prisma.MemberOrderByWithRelationInput {
  // KARAR: Ad/Soyad sıralaması için lastName alanını substring olarak kullanıyoruz;
  // derneklerde alfabetik sıralama soyada göredir ama sıralama seçeneği "firstName"
  // veya "lastName" olarak da gelebilir — birebir ilgili alana eşleriz.
  return { [params.sort]: params.dir } as Prisma.MemberOrderByWithRelationInput;
}

/** Liste sorgusu: findMany + count (Promise.all) — Faz 0 kalıbı. */
export async function listMembers(
  params: ListParams<MemberListFilterKeys>,
): Promise<ListResult<MemberListItem>> {
  const where = buildMemberWhere(params);
  const db = getDb();

  const [rows, total] = await Promise.all([
    db.member.findMany({
      where,
      select: MEMBER_SELECT,
      orderBy: orderBy(params),
      skip: params.skip,
      take: params.take,
    }),
    db.member.count({ where }),
  ]);

  return { rows: rows.map(toListItem), total, page: params.page, pageSize: params.pageSize };
}

/** Excel dışa aktarımı için satırlar: aynı where + sıralama, sayfalama yok. */
export async function listMembersForExport(
  params: ListParams<MemberListFilterKeys>,
  maxRows: number,
): Promise<MemberListItem[]> {
  const where = buildMemberWhere(params);
  const rows = await getDb().member.findMany({
    where,
    select: MEMBER_SELECT,
    orderBy: orderBy(params),
    take: maxRows,
  });
  return rows.map(toListItem);
}
