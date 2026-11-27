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

export type AuditFilterKey = "action" | "entity" | "from" | "to";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** #583: `filter.from` / `filter.to` (YYYY-MM-DD, UTC günü; toplantı listeleriyle aynı kural). */
export function auditDateRange(filters: Partial<Record<AuditFilterKey, string>>): Prisma.AuditLogWhereInput {
  const range: Prisma.DateTimeFilter = {};
  if (filters.from && ISO_DAY.test(filters.from)) range.gte = new Date(`${filters.from}T00:00:00.000Z`);
  if (filters.to && ISO_DAY.test(filters.to)) range.lte = new Date(`${filters.to}T23:59:59.999Z`);
  return Object.keys(range).length ? { createdAt: range } : {};
}

/** parseListParams çıktısıyla Prisma findMany + count (Promise.all) — 9.1. */
export async function listAuditLogs(
  params: ListParams<AuditFilterKey>,
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
    auditDateRange(params.filters),
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

/**
 * #583: Filtre seçenekleri veritabanındaki gerçek değerlerden gelir (sabit liste yeni modüllerin eklediği
 * işlem/varlık adlarını içermiyordu). Sınırlı sayıda değer döner.
 */
export async function listAuditFilterValues(): Promise<{ actions: string[]; entities: string[] }> {
  const db = getDb();
  const [actions, entities] = await Promise.all([
    db.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" }, take: 300 }),
    db.auditLog.groupBy({ by: ["entity"], orderBy: { entity: "asc" }, take: 300 }),
  ]);
  return { actions: actions.map((row) => row.action), entities: entities.map((row) => row.entity) };
}

/** #583: Tek kaydın değişiklik ayrıntısı (önce/sonra); çekmece açılınca istenir. */
export async function getAuditLogChanges(id: string): Promise<{ before: unknown; after: unknown } | null> {
  const row = await getDb().auditLog.findUnique({ where: { id }, select: { changes: true } });
  if (!row) return null;
  const changes = row.changes && typeof row.changes === "object" && !Array.isArray(row.changes) ? (row.changes as Record<string, unknown>) : {};
  return { before: changes.before ?? null, after: changes.after ?? null };
}
