import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { DonationListItem } from "../types";

export type DonationListFilterKeys =
  | "year"
  | "method"
  | "waived"
  | "confirmation"
  | "over300"
  | "from"
  | "to";

export const DONATION_SORTABLE_FIELDS = ["donationNumber", "receivedAt", "amount", "createdAt"] as const;
export const DONATION_DEFAULT_SORT = "receivedAt";

export async function buildDonationWhere(
  params: ListParams<DonationListFilterKeys>,
): Promise<Prisma.DonationWhereInput> {
  const conditions: Prisma.DonationWhereInput[] = [];
  const year = params.filters.year && /^\d{4}$/.test(params.filters.year) ? params.filters.year : null;
  if (year) conditions.push({ year: Number(year) });
  if (params.filters.method) {
    conditions.push({ method: params.filters.method as Prisma.EnumDonationMethodFilter["equals"] });
  }
  if (params.filters.waived === "1") conditions.push({ waivedReimbursement: true });
  if (params.filters.waived === "0") conditions.push({ waivedReimbursement: false });
  if (params.filters.over300 === "1") conditions.push({ amount: { gt: 300 } });
  // KARAR: Item ilişkisi Donation'da yok; bildirim filtresi alt sorgu id listesiyle.
  if (params.filters.confirmation && params.filters.confirmation !== "none") {
    // issued/cancelled: Item→Confirmation durum filtresi alt sorgu ile.
    const itemConditions: Prisma.ZuwendungConfirmationItemWhereInput =
      params.filters.confirmation === "issued"
        ? { activeKey: { not: null }, confirmation: { status: "ISSUED" } }
        : { confirmation: { status: "CANCELLED" } };
    const itemRows = await getDb().zuwendungConfirmationItem.findMany({
      where: { itemType: "DONATION", ...itemConditions },
      select: { sourceId: true },
    });
    conditions.push({ id: { in: itemRows.map((item) => item.sourceId) } });
  } else if (params.filters.confirmation === "none") {
    const itemRows = await getDb().zuwendungConfirmationItem.findMany({
      where: { itemType: "DONATION", activeKey: { not: null } },
      select: { sourceId: true },
    });
    conditions.push({ id: { notIn: itemRows.map((item) => item.sourceId) } });
  }

  if (params.q) {
    conditions.push({
      OR: [
        { donationNumber: { contains: params.q, mode: "insensitive" } },
        { donor: { firstName: { contains: params.q, mode: "insensitive" } } },
        { donor: { lastName: { contains: params.q, mode: "insensitive" } } },
        { donor: { organizationName: { contains: params.q, mode: "insensitive" } } },
        { reference: { contains: params.q, mode: "insensitive" } },
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
  if (dateRange.gte || dateRange.lt) conditions.push({ receivedAt: dateRange });

  return { AND: conditions };
}

/** Bağış listesi (§ 15 md. 1) + bildirim durumu kolonları. */
export async function listDonations(
  params: ListParams<DonationListFilterKeys>,
): Promise<ListResult<DonationListItem>> {
  const db = getDb();
  const where = await buildDonationWhere(params);

  const orderBy: Prisma.DonationOrderByWithRelationInput[] =
    params.sort === "receivedAt" && params.dir === "desc"
      ? [{ receivedAt: "desc" }, { sequence: "desc" }]
      : params.sort === "receivedAt"
        ? [{ receivedAt: "asc" }, { sequence: "asc" }]
        : [{ [params.sort]: params.dir } as Prisma.DonationOrderByWithRelationInput];

  const [rows, total] = await Promise.all([
    db.donation.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        donationNumber: true,
        receivedAt: true,
        amount: true,
        method: true,
        waivedReimbursement: true,
        reversedAt: true,
        bookingNumber: true,
        donor: { select: { id: true, donorNumber: true, type: true, firstName: true, lastName: true, organizationName: true } },
      },
    }),
    db.donation.count({ where }),
  ]);

  // Item durumu toplu sorgu (N+1 yok): Donation id → aktif/son bildirim.
  const itemRows = rows.length
    ? await db.zuwendungConfirmationItem.findMany({
        where: { itemType: "DONATION", sourceId: { in: rows.map((row) => row.id) } },
        select: {
          sourceId: true,
          activeKey: true,
          confirmation: { select: { confirmationNumber: true, status: true } },
        },
      })
    : [];
  const itemsByDonation = new Map<string, Array<(typeof itemRows)[number]>>();
  for (const item of itemRows) {
    const list = itemsByDonation.get(item.sourceId) ?? [];
    list.push(item);
    itemsByDonation.set(item.sourceId, list);
  }

  return {
    rows: rows.map((row) => {
      const items = itemsByDonation.get(row.id) ?? [];
      const activeItem = items.find((item) => item.activeKey !== null);
      const anyItem = items[0];
      return {
        id: row.id,
        donationNumber: row.donationNumber,
        receivedAt: row.receivedAt,
        donorId: row.donor.id,
        donorNumber: row.donor.donorNumber,
        donorName:
          row.donor.type === "ORGANIZATION"
            ? row.donor.organizationName ?? "-"
            : `${row.donor.firstName ?? ""} ${row.donor.lastName ?? ""}`.trim() || "-",
        amountCents: Number(row.amount.mul(100).toFixed(0)),
        method: row.method,
        waivedReimbursement: row.waivedReimbursement,
        confirmationNumber: activeItem?.confirmation.confirmationNumber ?? anyItem?.confirmation.confirmationNumber ?? null,
        confirmationCancelled: anyItem?.confirmation.status === "CANCELLED",
        bookingNumber: row.bookingNumber,
        reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
      };
    }),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

/** Excel dışa aktarımı (§ 15 md. 9): aynı where; adlar DAHİL (kişisel veri belgesi). */
export async function listDonationsForExport(
  params: ListParams<DonationListFilterKeys>,
  maxRows: number,
): Promise<DonationListItem[]> {
  const db = getDb();
  const where = await buildDonationWhere(params);
  const rows = await db.donation.findMany({
    where,
    orderBy: [{ receivedAt: "desc" }, { sequence: "desc" }],
    take: maxRows,
    select: {
      id: true,
      donationNumber: true,
      receivedAt: true,
      amount: true,
      method: true,
      waivedReimbursement: true,
      reversedAt: true,
      bookingNumber: true,
      donor: { select: { id: true, donorNumber: true, type: true, firstName: true, lastName: true, organizationName: true } },
    },
  });
  const itemRows = rows.length
    ? await db.zuwendungConfirmationItem.findMany({
        where: { itemType: "DONATION", sourceId: { in: rows.map((row) => row.id) } },
        select: {
          sourceId: true,
          activeKey: true,
          confirmation: { select: { confirmationNumber: true, status: true } },
        },
      })
    : [];
  const itemsByDonation = new Map<string, Array<(typeof itemRows)[number]>>();
  for (const item of itemRows) {
    const list = itemsByDonation.get(item.sourceId) ?? [];
    list.push(item);
    itemsByDonation.set(item.sourceId, list);
  }
  return rows.map((row) => {
    const items = itemsByDonation.get(row.id) ?? [];
    const activeItem = items.find((item) => item.activeKey !== null);
    const anyItem = items[0];
    return {
      id: row.id,
      donationNumber: row.donationNumber,
      receivedAt: row.receivedAt,
      donorId: row.donor.id,
      donorNumber: row.donor.donorNumber,
      donorName:
        row.donor.type === "ORGANIZATION"
          ? row.donor.organizationName ?? "-"
          : `${row.donor.firstName ?? ""} ${row.donor.lastName ?? ""}`.trim() || "-",
      amountCents: Number(row.amount.mul(100).toFixed(0)),
      method: row.method,
      waivedReimbursement: row.waivedReimbursement,
      confirmationNumber: activeItem?.confirmation.confirmationNumber ?? anyItem?.confirmation.confirmationNumber ?? null,
      confirmationCancelled: anyItem?.confirmation.status === "CANCELLED",
      bookingNumber: row.bookingNumber,
      reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
    };
  });
}
