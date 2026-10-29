import "server-only";

import { getDb } from "@/shared/db";
import { requirePermission } from "@/modules/auth/server";
import { mailPermissions } from "../permissions";
import { calculatePageCount, toMailLogStatus } from "../helpers/mail-helpers";
import type { MailLogFilters, MailLogListResult, MailLogRow } from "../types";

type MailLogRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getDb>["mailLog"]["findFirst"]>>
>;

function toMailLogRow(log: MailLogRecord): MailLogRow {
  return {
    id: log.id,
    toAddress: log.toAddress,
    toName: log.toName,
    subject: log.subject,
    status: toMailLogStatus(log.status),
    error: log.error,
    messageId: log.messageId,
    module: log.module,
    reference: log.reference,
    createdAt: log.createdAt.toISOString(),
  };
}

function buildWhere(filters: MailLogFilters) {
  const search = filters.search;
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.module ? { module: filters.module } : {}),
    ...(search
      ? {
          OR: [
            { toAddress: { contains: search, mode: "insensitive" as const } },
            { toName: { contains: search, mode: "insensitive" as const } },
            { subject: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

function buildOrderBy(filters: MailLogFilters) {
  const direction = filters.direction;
  const primary = (() => {
    switch (filters.sort) {
      case "toAddress":
        return { toAddress: direction };
      case "subject":
        return { subject: direction };
      case "status":
        return { status: direction };
      case "module":
        return { module: direction };
      case "createdAt":
      default:
        return { createdAt: direction };
    }
  })();
  return [primary, { id: "asc" as const }];
}

export async function listMailLogs(filters: MailLogFilters): Promise<MailLogListResult> {
  await requirePermission(mailPermissions, "view");
  const db = getDb();
  const where = buildWhere(filters);

  const [items, total] = await Promise.all([
    db.mailLog.findMany({
      where,
      orderBy: buildOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.mailLog.count({ where }),
  ]);

  return {
    items: items.map(toMailLogRow),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: calculatePageCount(total, filters.pageSize),
  };
}

/** Distinct module names that have sent mail (for the module filter). */
export async function listMailLogModules(): Promise<string[]> {
  await requirePermission(mailPermissions, "view");
  const db = getDb();
  const groups = await db.mailLog.groupBy({ by: ["module"], orderBy: { module: "asc" } });
  return groups.map((group) => group.module);
}
