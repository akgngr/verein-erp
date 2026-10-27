import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { ConfirmationListItem } from "../types";

export type ConfirmationListFilterKeys = "year" | "kind" | "content" | "status" | "warned";

export const CONFIRMATION_SORTABLE_FIELDS = ["confirmationNumber", "issuedAt", "totalAmount"] as const;
export const CONFIRMATION_DEFAULT_SORT = "issuedAt";

export function buildConfirmationWhere(
  params: ListParams<ConfirmationListFilterKeys>,
): Prisma.ZuwendungConfirmationWhereInput {
  const conditions: Prisma.ZuwendungConfirmationWhereInput[] = [];
  const year = params.filters.year && /^\d{4}$/.test(params.filters.year) ? params.filters.year : null;
  if (year) conditions.push({ year: Number(year) });
  if (params.filters.kind) {
    conditions.push({ kind: params.filters.kind as Prisma.EnumConfirmationKindFilter["equals"] });
  }
  if (params.filters.content) {
    conditions.push({ content: params.filters.content as Prisma.EnumConfirmationContentFilter["equals"] });
  }
  if (params.filters.status) {
    conditions.push({ status: params.filters.status as Prisma.EnumConfirmationStatusFilter["equals"] });
  }
  if (params.q) {
    conditions.push({
      OR: [
        { confirmationNumber: { contains: params.q, mode: "insensitive" } },
        { recipientName: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }
  return { AND: conditions };
}

/** Bildirim listesi (§ 15 md. 5): void uyarısı § 11 md. 11 ile işaretlenir. */
export async function listConfirmations(
  params: ListParams<ConfirmationListFilterKeys>,
): Promise<ListResult<ConfirmationListItem>> {
  const db = getDb();
  const where = buildConfirmationWhere(params);

  const [rows, total] = await Promise.all([
    db.zuwendungConfirmation.findMany({
      where,
      orderBy: [{ issuedAt: "desc" }, { sequence: "desc" }],
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        confirmationNumber: true,
        issuedAt: true,
        kind: true,
        content: true,
        recipientName: true,
        totalAmount: true,
        status: true,
        items: {
          where: { itemType: "MEMBER_PAYMENT" },
          select: { sourceId: true },
        },
      },
    }),
    db.zuwendungConfirmation.count({ where }),
  ]);

  // Void uyarısı (§ 11 md. 11): MEMBER_PAYMENT ögelerinin güncel durumu.
  const memberPaymentIds = [...new Set(rows.flatMap((row) => row.items.map((item) => item.sourceId)))];
  const payments = memberPaymentIds.length
    ? await db.memberPayment.findMany({
        where: { id: { in: memberPaymentIds }, voidedAt: { not: null } },
        select: { id: true },
      })
    : [];
  const voidedIds = new Set(payments.map((payment) => payment.id));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      confirmationNumber: row.confirmationNumber,
      issuedAt: row.issuedAt,
      kind: row.kind,
      content: row.content,
      recipientName: row.recipientName,
      totalCents: Number(row.totalAmount.mul(100).toFixed(0)),
      status: row.status,
      voidedPaymentWarning: row.items.some((item) => voidedIds.has(item.sourceId)),
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}
