import "server-only";

import type { ActionItemStatus, Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import { berlinToday } from "../utils";
import type { ActionItemListFilterKeys, ActionItemRow } from "../types";

/** Sıralanabilir alanlar ve varsayılan sıralama (7.4): dueDate asc, nulls last. */
export const ACTION_ITEM_SORTABLE_FIELDS = ["dueDate", "status", "createdAt"] as const;

export const ACTION_ITEM_DEFAULT_SORT = "dueDate";

/**
 * Görev listesi where üreticisi (7.4): silinmemiş toplantıların görevleri.
 * KARAR: filter.status yoksa OPEN uygulanır (varsayılan görünüm yalnızca açık
 * görevler); "Tümü" açık seçenek boş değer göndermez, status=* ile tümü istenir.
 */
export function buildActionItemWhere(
  params: ListParams<ActionItemListFilterKeys>,
  currentUserId: string,
): Prisma.ActionItemWhereInput {
  const conditions: Prisma.ActionItemWhereInput[] = [{ meeting: { deletedAt: null } }];

  if (params.q) {
    conditions.push({
      OR: [
        { description: { contains: params.q, mode: "insensitive" } },
        { assigneeLabel: { contains: params.q, mode: "insensitive" } },
        { meeting: { meetingNumber: { contains: params.q, mode: "insensitive" } } },
        { meeting: { title: { contains: params.q, mode: "insensitive" } } },
      ],
    });
  }

  const statusFilter = params.filters.status;
  if (statusFilter === "*") {
    // "Tümü" seçeneği — durum filtresi uygulanmaz.
  } else if (statusFilter) {
    conditions.push({ status: statusFilter as ActionItemStatus });
  } else {
    conditions.push({ status: "OPEN" });
  }

  if (params.filters.assigneeId) {
    conditions.push({ assigneeId: params.filters.assigneeId });
  }

  if (params.filters.mine === "1") {
    conditions.push({ assigneeId: currentUserId });
  }

  const today = berlinToday();
  if (params.filters.overdue === "1") {
    conditions.push({ status: "OPEN", dueDate: { lt: today } });
  }

  const dateRange: Prisma.DateTimeFilter = {};
  if (params.filters.from && /^\d{4}-\d{2}-\d{2}$/.test(params.filters.from)) {
    dateRange.gte = new Date(`${params.filters.from}T00:00:00.000Z`);
  }
  if (params.filters.to && /^\d{4}-\d{2}-\d{2}$/.test(params.filters.to)) {
    dateRange.lte = new Date(`${params.filters.to}T23:59:59.999Z`);
  }
  if (dateRange.gte || dateRange.lte) {
    conditions.push({ dueDate: dateRange });
  }

  return { AND: conditions };
}

/** Çapraz toplantı görev listesi (7.4). */
export async function listActionItems(
  params: ListParams<ActionItemListFilterKeys>,
  currentUserId: string,
): Promise<ListResult<ActionItemRow>> {
  const db = getDb();
  const where = buildActionItemWhere(params, currentUserId);

  const orderBy: Prisma.ActionItemOrderByWithRelationInput[] =
    params.sort === "status"
      ? [{ status: params.dir }, { dueDate: "asc" }]
      : params.sort === "createdAt"
        ? [{ createdAt: params.dir }]
        : [{ dueDate: params.dir }];

  // KARAR: dueDate asc sıralamasında null tarihler Prisma'da varsayılan olarak
  // önce gelir; nulls last için "sort nulls last" Prisma 6 desteği { sort: params.dir, nulls: "last" }.
  if (params.sort === "dueDate") {
    orderBy[0] = { dueDate: { sort: params.dir, nulls: "last" } };
  }

  const [rows, total] = await Promise.all([
    db.actionItem.findMany({
      where,
      orderBy: [...orderBy, { id: "asc" }],
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        meetingId: true,
        description: true,
        assigneeId: true,
        assigneeLabel: true,
        dueDate: true,
        status: true,
        decisionId: true,
        decision: { select: { decisionNumber: true } },
        meeting: { select: { meetingNumber: true, title: true } },
      },
    }),
    db.actionItem.count({ where }),
  ]);

  return {
    rows: rows.map((actionItem) => ({
      id: actionItem.id,
      meetingId: actionItem.meetingId,
      meetingNumber: actionItem.meeting.meetingNumber,
      meetingTitle: actionItem.meeting.title,
      description: actionItem.description,
      assigneeId: actionItem.assigneeId,
      assigneeLabel: actionItem.assigneeLabel,
      dueDate: actionItem.dueDate,
      status: actionItem.status,
      decisionId: actionItem.decisionId,
      decisionNumber: actionItem.decision?.decisionNumber ?? null,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}
