import "server-only";

import { getDb } from "@/shared/db";

import type { DonationDetail } from "../types";

/** Bağış detayı (§ 15 md. 3). */
export async function getDonation(id: string): Promise<DonationDetail | null> {
  const db = getDb();
  const donation = await db.donation.findUnique({ where: { id }, include: { donor: true } });
  if (!donation) return null;

  // KARAR: Donation üzerinde Item ilişki alanı yok — aktif öge sorgusu Item tablosundan.
  const items = await db.zuwendungConfirmationItem.findMany({
    where: { itemType: "DONATION", sourceId: donation.id },
    select: { activeKey: true, confirmation: { select: { confirmationNumber: true, status: true } } },
  });
  const activeItem = items.find((item) => item.activeKey !== null);
  const anyItem = items[0];

  return {
    id: donation.id,
    donationNumber: donation.donationNumber,
    receivedAt: donation.receivedAt,
    donorId: donation.donor.id,
    donorNumber: donation.donor.donorNumber,
    donorName:
      donation.donor.type === "ORGANIZATION"
        ? donation.donor.organizationName ?? "-"
        : `${donation.donor.firstName ?? ""} ${donation.donor.lastName ?? ""}`.trim() || "-",
    amountCents: Number(donation.amount.mul(100).toFixed(0)),
    method: donation.method,
    waivedReimbursement: donation.waivedReimbursement,
    confirmationNumber: activeItem?.confirmation.confirmationNumber ?? anyItem?.confirmation.confirmationNumber ?? null,
    confirmationCancelled: anyItem?.confirmation.status === "CANCELLED",
    bookingNumber: donation.bookingNumber,
    reversedAt: donation.reversedAt ? donation.reversedAt.toISOString() : null,
    year: donation.year,
    sequence: donation.sequence,
    reference: donation.reference,
    purposeNote: donation.purposeNote,
    claimBasis: donation.claimBasis,
    waiverDeclaredAt: donation.waiverDeclaredAt,
    expenseCategoryId: donation.expenseCategoryId,
    waiverBookingNumber: donation.waiverBookingNumber,
    reverseReason: donation.reverseReason,
    hasActiveConfirmationItem: activeItem !== undefined,
    createdById: donation.createdById,
    createdByLabel: donation.createdByLabel,
    createdAt: donation.createdAt,
    updatedByLabel: donation.updatedByLabel,
    updatedAt: donation.updatedAt,
  };
}
