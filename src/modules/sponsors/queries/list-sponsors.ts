import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import { SPONSOR_STATUSES, SPONSOR_TIERS, type SponsorStatus, type SponsorTier } from "../constants";
import type { SponsorRow, SponsorSummary } from "../types";

export const SPONSOR_SORTABLE_FIELDS = ["name", "tier", "status", "amountCents", "updatedAt", "createdAt"] as const;
export const SPONSOR_DEFAULT_SORT = "updatedAt";

export type SponsorFilterKeys = "status" | "tier";

const VALID_STATUSES = new Set<string>(SPONSOR_STATUSES);
const VALID_TIERS = new Set<string>(SPONSOR_TIERS);

function toSponsorRow(record: {
  id: string;
  name: string;
  tier: string;
  status: string;
  amountCents: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SponsorRow {
  return {
    ...record,
    tier: (VALID_TIERS.has(record.tier) ? record.tier : "SUPPORTER") as SponsorTier,
    status: (VALID_STATUSES.has(record.status) ? record.status : "ACTIVE") as SponsorStatus,
  };
}

export function buildSponsorWhere(params: ListParams<SponsorFilterKeys>): Prisma.SponsorWhereInput {
  const statusFilter = params.filters.status && VALID_STATUSES.has(params.filters.status) ? params.filters.status : undefined;
  const tierFilter = params.filters.tier && VALID_TIERS.has(params.filters.tier) ? params.filters.tier : undefined;

  return {
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { contactName: { contains: params.q, mode: "insensitive" } },
            { notes: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(tierFilter ? { tier: tierFilter } : {}),
  };
}

export async function listSponsors(params: ListParams<SponsorFilterKeys>): Promise<ListResult<SponsorRow>> {
  const where = buildSponsorWhere(params);
  const db = getDb();
  const [records, total] = await Promise.all([
    db.sponsor.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
    }),
    db.sponsor.count({ where }),
  ]);
  return {
    rows: records.map(toSponsorRow),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getSponsor(id: string): Promise<SponsorRow | null> {
  const record = await getDb().sponsor.findUnique({ where: { id } });
  return record ? toSponsorRow(record) : null;
}

export async function getSponsorSummary(): Promise<SponsorSummary> {
  const db = getDb();
  const [totalCount, activeAgg, leadCount] = await Promise.all([
    db.sponsor.count(),
    db.sponsor.aggregate({
      where: { status: "ACTIVE" },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    db.sponsor.count({ where: { status: "LEAD" } }),
  ]);

  return {
    totalCount,
    activeCount: activeAgg._count._all,
    activeAmountCents: activeAgg._sum.amountCents ?? 0,
    leadCount,
  };
}
