import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { YouthProtectionRow } from "../types";

export const ITEM_SORTABLE_FIELDS = [
  "personName",
  "nextDueDate",
  "inspectionDate",
  "certificateIssueDate",
  "inspectingOfficer",
  "status",
  "activityEndedAt",
  "updatedAt",
  "createdAt",
] as const;

export const ITEM_DEFAULT_SORT = "nextDueDate";

export type YouthProtectionItemFilterKeys = "status";

export function buildYouthProtectionItemWhere(
  params: ListParams<YouthProtectionItemFilterKeys>,
  now: Date = new Date(),
): Prisma.YouthProtectionRecordWhereInput {
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const status = params.filters.status;
  let statusCondition: Prisma.YouthProtectionRecordWhereInput = {};

  if (status === "overdue") {
    statusCondition = { activityEndedAt: null, nextDueDate: { lt: now } };
  } else if (status === "upcoming") {
    statusCondition = { activityEndedAt: null, nextDueDate: { gte: now, lte: threeMonthsLater } };
  } else if (status === "valid") {
    statusCondition = { activityEndedAt: null, nextDueDate: { gt: threeMonthsLater } };
  } else if (status === "ended") {
    statusCondition = { activityEndedAt: { not: null } };
  }

  const searchCondition: Prisma.YouthProtectionRecordWhereInput = params.q
    ? {
        OR: [
          { personName: { contains: params.q, mode: "insensitive" } },
          { inspectingOfficer: { contains: params.q, mode: "insensitive" } },
        ],
      }
    : {};

  return {
    AND: [searchCondition, statusCondition],
  };
}

/** Liste sorgusu: arama (kişi/yetkili), durum filtresi (vadesi geçmiş/yaklaşan/geçerli/sonlanmış), sıralama ve sayfalama. */
export async function listYouthProtectionItems(
  params: ListParams<YouthProtectionItemFilterKeys>,
): Promise<ListResult<YouthProtectionRow>> {
  const where = buildYouthProtectionItemWhere(params);
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.youthProtectionRecord.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
    }),
    db.youthProtectionRecord.count({ where }),
  ]);
  return { rows, total, page: params.page, pageSize: params.pageSize };
}

export async function getYouthProtectionItem(id: string): Promise<YouthProtectionRow | null> {
  return getDb().youthProtectionRecord.findUnique({ where: { id } });
}
