import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

export type AuditLogRow = {
  id: string;
  userLabel: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: Date;
};

/** parseListParams çıktısıyla Prisma findMany + count (Promise.all) — 9.1. */
export async function listAuditLogs(
  params: ListParams<"action" | "entity">,
): Promise<ListResult<AuditLogRow>> {
  const conditions: Prisma.AuditLogWhereInput[] = [
    params.q
      ? {
          OR: [
            { userLabel: { contains: params.q, mode: "insensitive" } },
            { entityId: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {},
    params.filters.action ? { action: params.filters.action } : {},
    params.filters.entity ? { entity: params.filters.entity } : {},
  ];
  const where = { AND: conditions.filter((condition) => Object.keys(condition).length > 0) };

  const db = getDb();
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: {
        id: true,
        userLabel: true,
        action: true,
        entity: true,
        entityId: true,
        ip: true,
        createdAt: true,
      },
      orderBy: { [params.sort]: params.dir } as Prisma.AuditLogOrderByWithRelationInput,
      skip: params.skip,
      take: params.take,
    }),
    db.auditLog.count({ where }),
  ]);

  return { rows, total, page: params.page, pageSize: params.pageSize };
}
