import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { DonorListItem } from "../types";

/** URL filter.* anahtarları. */
export type DonorListFilterKeys = "type" | "active";

export const DONOR_SORTABLE_FIELDS = ["donorNumber", "lastName", "organizationName", "createdAt"] as const;
export const DONOR_DEFAULT_SORT = "donorNumber";

export function buildDonorWhere(params: ListParams<DonorListFilterKeys>): Prisma.DonorWhereInput {
  const conditions: Prisma.DonorWhereInput[] = [];
  if (params.filters.type) {
    conditions.push({ type: params.filters.type as Prisma.EnumDonorTypeFilter["equals"] });
  }
  if (params.filters.active === "1") conditions.push({ isActive: true });
  if (params.filters.active === "0") conditions.push({ isActive: false });
  if (params.q) {
    conditions.push({
      OR: [
        { donorNumber: params.q.replace(/^\D+/, "") ? Number(params.q.replace(/^\D+/, "")) || -1 : undefined },
        { firstName: { contains: params.q, mode: "insensitive" } },
        { lastName: { contains: params.q, mode: "insensitive" } },
        { organizationName: { contains: params.q, mode: "insensitive" } },
        { city: { contains: params.q, mode: "insensitive" } },
      ].filter(Boolean) as Prisma.DonorWhereInput[],
    });
  }
  return { AND: conditions };
}

function displayName(row: {
  type: string;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
}): string {
  return row.type === "ORGANIZATION"
    ? row.organizationName ?? "-"
    : `${row.lastName ?? ""}, ${row.firstName ?? ""}`.replace(/^, |, $/g, "") || "-";
}

/** Bağışçı listesi: bağış sayısı + toplam (tersler hariç). */
export async function listDonors(
  params: ListParams<DonorListFilterKeys>,
): Promise<ListResult<DonorListItem>> {
  const db = getDb();
  const where = buildDonorWhere(params);

  const [rows, total] = await Promise.all([
    db.donor.findMany({
      where,
      orderBy: { [params.sort === "donorNumber" ? "donorNumber" : params.sort === "createdAt" ? "createdAt" : params.sort === "organizationName" ? "organizationName" : "lastName"]: params.dir },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        donorNumber: true,
        type: true,
        firstName: true,
        lastName: true,
        organizationName: true,
        city: true,
        isActive: true,
        isAnonymized: true,
        donations: {
          where: { reversedAt: null },
          select: { amount: true },
        },
      },
    }),
    db.donor.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      donorNumber: row.donorNumber,
      type: row.type,
      displayName: displayName(row),
      city: row.city,
      isActive: row.isActive,
      isAnonymized: row.isAnonymized,
      donationCount: row.donations.length,
      totalCents: row.donations.reduce((sum, donation) => sum + Number(donation.amount.mul(100).toFixed(0)), 0),
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

/** Excel dışa aktarımı için (§ 15 md. 4 listesi; KARAR: Excel bağışçı adlarını TAŞIR — kişisel veri belgesi). */
export async function listDonorsForExport(
  params: ListParams<DonorListFilterKeys>,
  maxRows: number,
): Promise<DonorListItem[]> {
  const db = getDb();
  const where = buildDonorWhere(params);
  const rows = await db.donor.findMany({
    where,
    orderBy: { donorNumber: "asc" },
    take: maxRows,
    select: {
      id: true,
      donorNumber: true,
      type: true,
      firstName: true,
      lastName: true,
      organizationName: true,
      city: true,
      isActive: true,
      isAnonymized: true,
      donations: { where: { reversedAt: null }, select: { amount: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    donorNumber: row.donorNumber,
    type: row.type,
    displayName: displayName(row),
    city: row.city,
    isActive: row.isActive,
    isAnonymized: row.isAnonymized,
    donationCount: row.donations.length,
    totalCents: row.donations.reduce((sum, donation) => sum + Number(donation.amount.mul(100).toFixed(0)), 0),
  }));
}
