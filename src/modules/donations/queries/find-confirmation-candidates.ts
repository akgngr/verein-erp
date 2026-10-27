import "server-only";

import { getDb } from "@/shared/db";
import { listMemberFeePaymentsForConfirmation } from "@/modules/members/server";

import type { ConfirmationCandidate } from "../types";

/**
 * Bildirim adayları (§ 15 md. 6 candidate-picker): aktif ögesi olmayan
 * bağışlar/aidat ödemeleri; vazgeçim değeri gruplaması UI'da yapılır.
 */
export async function findDonationCandidates(donorId: string, year: number): Promise<ConfirmationCandidate[]> {
  const db = getDb();
  const activeItems = await db.zuwendungConfirmationItem.findMany({
    where: { activeKey: { not: null }, itemType: "DONATION" },
    select: { sourceId: true },
  });
  const activeSourceIds = new Set(activeItems.map((item) => item.sourceId));

  const donations = await db.donation.findMany({
    where: {
      donorId,
      reversedAt: null,
      receivedAt: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
    orderBy: { receivedAt: "asc" },
    select: { id: true, donationNumber: true, receivedAt: true, amount: true, waivedReimbursement: true },
  });

  return donations
    .filter((donation) => !activeSourceIds.has(donation.id))
    .map((donation) => ({
      sourceId: donation.id,
      itemDate: donation.receivedAt,
      amountCents: Number(donation.amount.mul(100).toFixed(0)),
      label: "Geldspende",
      waived: donation.waivedReimbursement,
      sourceNumber: donation.donationNumber,
    }));
}

export async function findMemberFeeCandidates(memberId: string, year: number): Promise<ConfirmationCandidate[]> {
  const db = getDb();
  const rows = (await listMemberFeePaymentsForConfirmation({ year })).find(
    (row) => row.memberId === memberId,
  );
  if (!rows) return [];

  const activeItems = await db.zuwendungConfirmationItem.findMany({
    where: { activeKey: { not: null }, itemType: "MEMBER_PAYMENT" },
    select: { sourceId: true },
  });
  const activeSourceIds = new Set(activeItems.map((item) => item.sourceId));

  return rows.payments
    .filter((payment) => !activeSourceIds.has(payment.id))
    .map((payment) => ({
      sourceId: payment.id,
      itemDate: new Date(`${payment.paidAt}T00:00:00Z`),
      amountCents: payment.amountCents,
      label: "Mitgliedsbeitrag",
      waived: false,
      sourceNumber: payment.receiptNumber,
    }));
}

/** Yıllık toplu üretim adayları (§ 11 md. 9 md. 4): alıcı kimliği listesi. */
export async function findBatchRecipients(
  content: "DONATION" | "MEMBERSHIP_FEE",
  year: number,
): Promise<Array<{ id: string; label: string }>> {
  const db = getDb();
  if (content === "DONATION") {
    const donors = await db.donor.findMany({
      where: { isActive: true, donations: { some: { reversedAt: null, receivedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } } } },
      orderBy: [{ lastName: "asc" }, { organizationName: "asc" }],
      select: { id: true, donorNumber: true, firstName: true, lastName: true, organizationName: true },
    });
    return donors.map((donor) => ({
      id: donor.id,
      label: `SP-${String(donor.donorNumber).padStart(4, "0")} — ${donor.organizationName ?? `${donor.firstName ?? ""} ${donor.lastName ?? ""}`.trim()}`,
    }));
  }
  const payments = await listMemberFeePaymentsForConfirmation({ year });
  return payments.map((row) => ({
    id: row.memberId,
    label: `${row.memberNumber} — ${row.name}`,
  }));
}
