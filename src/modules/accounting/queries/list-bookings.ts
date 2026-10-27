import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { BookingListItem } from "../types";

/** URL'deki filter.* anahtarları (§ 11.1). */
export type BookingListFilterKeys =
  | "year"
  | "type"
  | "accountId"
  | "categoryId"
  | "sphere"
  | "projectId"
  | "missingReceipt"
  | "source"
  | "includeReversed"
  | "from"
  | "to";

/** Sıralanabilir alanlar (§ 11.1): tarih, numara, tutar, oluşturma. */
export const BOOKING_SORTABLE_FIELDS = [
  "bookingDate",
  "bookingNumber",
  "amount",
  "createdAt",
] as const;

export const BOOKING_DEFAULT_SORT = "bookingDate";

/**
 * Filtre oluşturucu — liste ve Excel dışa aktarım TEK BURADAN where üretir.
 * Varsayılan: seçili yılın TÜM fişleri (iptaller dahil; UI üstü çizili gösterir).
 */
export function buildBookingWhere(
  params: ListParams<BookingListFilterKeys>,
): Prisma.AccountingBookingWhereInput {
  const conditions: Prisma.AccountingBookingWhereInput[] = [];

  // Yıl zorunlu filtre (varsayılan UI'dan gelir; yoksa geçerli yıl).
  const yearRaw = params.filters.year;
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : new Date().getUTCFullYear();
  conditions.push({ year });

  if (params.filters.type && params.filters.type !== "ALL") {
    conditions.push({ type: params.filters.type as Prisma.EnumBookingTypeFilter["equals"] });
  }
  if (params.filters.accountId) {
    conditions.push({
      OR: [
        { accountId: params.filters.accountId },
        { counterAccountId: params.filters.accountId },
      ],
    });
  }
  if (params.filters.categoryId) {
    conditions.push({ categoryId: params.filters.categoryId });
  }
  if (params.filters.projectId) {
    conditions.push({ projectId: params.filters.projectId });
  }
  if (params.filters.sphere) {
    conditions.push({
      category: { sphere: params.filters.sphere as Prisma.EnumSphereFilter["equals"] },
    });
  }
  if (params.filters.source === "manual") {
    conditions.push({ sourceType: null });
  } else if (params.filters.source === "member") {
    conditions.push({ sourceType: "MEMBER_PAYMENT" });
  }

  // "İptal edilenleri gizle" (varsayılan: gizli? KARAR: UI varsayılan işaretsiz —
  // iptaller görünür; işaretliyse gizlenir).
  if (params.filters.includeReversed !== "1") {
    // KARAR: listede iptaller görünür kalır (§ 11.1 üstü çizili); "gizle"
    // seçiliyse exclude edilir. Varsayılan: görünür.
    if (params.filters.includeReversed === "hide") {
      conditions.push({ reversedAt: null });
    }
  } else {
    // includeReversed=1 yalnızca iptaller (filtre seçeneği yok — güvenli: tümü).
  }

  // Belgesi eksik (§ 8 md. 14): aktif dosya yok VE transer değil VE kaynak fiş yok.
  if (params.filters.missingReceipt === "1") {
    conditions.push({ type: { not: "TRANSFER" }, sourceType: null, files: { none: { deletedAt: null } } });
  }

  if (params.q) {
    conditions.push({
      OR: [
        { bookingNumber: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
        { counterparty: { contains: params.q, mode: "insensitive" } },
        { receiptReference: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

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
    conditions.push({ bookingDate: dateRange });
  }

  return { AND: conditions };
}

const BOOKING_SELECT = {
  id: true,
  bookingNumber: true,
  type: true,
  bookingDate: true,
  amount: true,
  description: true,
  counterparty: true,
  receiptReference: true,
  reversedAt: true,
  reverseReason: true,
  sourceType: true,
  account: { select: { name: true } },
  counterAccount: { select: { name: true } },
  category: { select: { name: true, sphere: true } },
  project: { select: { name: true } },
  _count: { select: { files: { where: { deletedAt: null } } } },
} satisfies Prisma.AccountingBookingSelect;

type BookingRow = Prisma.AccountingBookingGetPayload<{ select: typeof BOOKING_SELECT }>;

function toListItem(row: BookingRow): BookingListItem {
  const fileCount = row._count.files;
  const hasReceipt =
    fileCount > 0 || row.type === "TRANSFER" || row.sourceType !== null;
  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    type: row.type,
    bookingDate: row.bookingDate,
    accountName: row.account.name,
    transferLine:
      row.type === "TRANSFER"
        ? `${row.account.name} → ${row.counterAccount?.name ?? "-"}`
        : null,
    categoryName: row.category?.name ?? null,
    categorySphere: row.category?.sphere ?? null,
    project: row.project?.name ?? null,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    description: row.description,
    counterparty: row.counterparty,
    receiptReference: row.receiptReference,
    fileCount,
    hasReceipt,
    reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
    reverseReason: row.reverseReason,
    sourceType: row.sourceType,
  };
}

function orderBy(
  params: ListParams<BookingListFilterKeys>,
): Prisma.AccountingBookingOrderByWithRelationInput[] {
  // Varsayılan: tarih azalan, sonra sıra azalan (§ 11.1).
  if (params.sort === "bookingDate" && params.dir === "desc") {
    return [{ bookingDate: "desc" }, { sequence: "desc" }];
  }
  if (params.sort === "bookingDate") {
    return [{ bookingDate: "asc" }, { sequence: "asc" }];
  }
  return [{ [params.sort]: params.dir } as Prisma.AccountingBookingOrderByWithRelationInput];
}

/** Liste sorgusu: findMany + count (Promise.all) — Faz 0 kalıbı. */
export async function listBookings(
  params: ListParams<BookingListFilterKeys>,
): Promise<ListResult<BookingListItem>> {
  const where = buildBookingWhere(params);
  const db = getDb();

  const [rows, total] = await Promise.all([
    db.accountingBooking.findMany({
      where,
      select: BOOKING_SELECT,
      orderBy: orderBy(params),
      skip: params.skip,
      take: params.take,
    }),
    db.accountingBooking.count({ where }),
  ]);

  return { rows: rows.map(toListItem), total, page: params.page, pageSize: params.pageSize };
}

/** Excel dışa aktarımı için satırlar: aynı where + sıralama, sayfalama yok. */
export async function listBookingsForExport(
  params: ListParams<BookingListFilterKeys>,
  maxRows: number,
): Promise<BookingListItem[]> {
  const where = buildBookingWhere(params);
  const rows = await getDb().accountingBooking.findMany({
    where,
    select: BOOKING_SELECT,
    orderBy: orderBy(params),
    take: maxRows,
  });
  return rows.map(toListItem);
}
