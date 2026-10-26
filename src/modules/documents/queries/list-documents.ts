import "server-only";

import type { DocumentStatus, Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { DocumentListItem } from "../types";
import { berlinToday, isDocumentOverdue } from "../utils";

/** URL'deki filter.* anahtarları (8.1). */
export type DocumentListFilterKeys =
  | "direction"
  | "status"
  | "categoryId"
  | "assigneeId"
  | "from"
  | "to"
  | "mine"
  | "overdue";

/** Sıralanabilir alanlar ve varsayılan sıralama (8.1). */
export const DOCUMENT_SORTABLE_FIELDS = [
  "registryNumber",
  "documentDate",
  "registeredAt",
  "counterparty",
  "subject",
  "status",
  "dueDate",
] as const;

export const DOCUMENT_DEFAULT_SORT = "registeredAt";

/**
 * Filtre oluşturucu — liste, Excel dışa aktarım ve istatistikten gelen tüm
 * sorgular TEK BURADAN where üretir (10. bölüm: kod tekrarı yapılmaz).
 * Silinmiş kayıtlar (deletedAt != null) her koşulda dışarıda bırakılır.
 */
export function buildDocumentWhere(
  params: ListParams<DocumentListFilterKeys>,
  currentUserId: string,
): Prisma.DocumentWhereInput {
  const conditions: Prisma.DocumentWhereInput[] = [{ deletedAt: null }];

  if (params.q) {
    conditions.push({
      OR: [
        { registryNumber: { contains: params.q, mode: "insensitive" } },
        { counterparty: { contains: params.q, mode: "insensitive" } },
        { subject: { contains: params.q, mode: "insensitive" } },
        { referenceNumber: { contains: params.q, mode: "insensitive" } },
        { summary: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  if (params.filters.direction) {
    conditions.push({
      direction: params.filters.direction as Prisma.EnumDocumentDirectionFilter["equals"],
    });
  }

  if (params.filters.status) {
    conditions.push({ status: params.filters.status as DocumentStatus });
  }

  if (params.filters.categoryId) {
    conditions.push({ categoryId: params.filters.categoryId });
  }

  if (params.filters.assigneeId) {
    conditions.push({ assigneeId: params.filters.assigneeId });
  }

  // Tarih aralığı: evrak tarihi (documentDate, @db.Date) üzerinden (8.1).
  // from/to "YYYY-MM-DD" beklenir; to dahil olsun diye ertesi günün başına kadar taranır.
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
    conditions.push({ documentDate: dateRange });
  }

  // "Bana atananlar": oturum kullanıcısına atanmış evraklar (8.1).
  if (params.filters.mine === "1" && currentUserId) {
    conditions.push({ assigneeId: currentUserId });
  }

  // "Süresi geçmişler": dueDate bugünden önce + durum açık/işlemde (5. bölüm md. 3).
  if (params.filters.overdue === "1") {
    conditions.push({
      dueDate: { lt: berlinToday() },
      status: { in: ["OPEN", "IN_PROGRESS"] },
    });
  }

  return { AND: conditions };
}

function toListItem(row: DocumentRow): DocumentListItem {
  return {
    id: row.id,
    direction: row.direction,
    registryNumber: row.registryNumber,
    registeredAt: row.registeredAt,
    documentDate: row.documentDate,
    counterparty: row.counterparty,
    referenceNumber: row.referenceNumber,
    subject: row.subject,
    status: row.status,
    dueDate: row.dueDate,
    deliveryMethod: row.deliveryMethod,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    assigneeId: row.assigneeId,
    assigneeLabel: row.assigneeLabel,
    fileCount: row._count.files,
    isOverdue: isDocumentOverdue(row.status, row.dueDate, berlinToday()),
  };
}

const DOCUMENT_SELECT = {
  id: true,
  direction: true,
  registryNumber: true,
  registeredAt: true,
  documentDate: true,
  counterparty: true,
  referenceNumber: true,
  subject: true,
  status: true,
  dueDate: true,
  deliveryMethod: true,
  categoryId: true,
  category: { select: { name: true } },
  assigneeId: true,
  assigneeLabel: true,
  _count: { select: { files: { where: { deletedAt: null } } } },
} satisfies Prisma.DocumentSelect;

type DocumentRow = Prisma.DocumentGetPayload<{ select: typeof DOCUMENT_SELECT }>;

function orderBy(params: ListParams<DocumentListFilterKeys>): Prisma.DocumentOrderByWithRelationInput {
  return { [params.sort]: params.dir } as Prisma.DocumentOrderByWithRelationInput;
}

/** Liste sorgusu: findMany + count (Promise.all) — Faz 0 kalıbı (9.1). */
export async function listDocuments(
  params: ListParams<DocumentListFilterKeys>,
  currentUserId: string,
): Promise<ListResult<DocumentListItem>> {
  const where = buildDocumentWhere(params, currentUserId);
  const db = getDb();

  const [rows, total] = await Promise.all([
    db.document.findMany({
      where,
      select: DOCUMENT_SELECT,
      orderBy: orderBy(params),
      skip: params.skip,
      take: params.take,
    }),
    db.document.count({ where }),
  ]);

  return { rows: rows.map(toListItem), total, page: params.page, pageSize: params.pageSize };
}

/**
 * Excel dışa aktarımı için satırlar: aynı where + sıralama, sayfalama yok,
 * en fazla maxRows satır (10. bölüm).
 */
export async function listDocumentsForExport(
  params: ListParams<DocumentListFilterKeys>,
  currentUserId: string,
  maxRows: number,
): Promise<DocumentListItem[]> {
  const where = buildDocumentWhere(params, currentUserId);
  const rows = await getDb().document.findMany({
    where,
    select: DOCUMENT_SELECT,
    orderBy: orderBy(params),
    take: maxRows,
  });
  return rows.map(toListItem);
}
