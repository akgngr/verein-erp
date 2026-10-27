import "server-only";

import { getDb } from "@/shared/db";

import { retentionEndDate } from "../services/issue-guards";
import type { DonorDetail } from "../types";

/** Bağışçı detayı (§ 15 md. 4) + anonimleştirme engel bilgisi. */
export async function getDonor(id: string): Promise<DonorDetail | null> {
  const db = getDb();
  const donor = await db.donor.findUnique({
    where: { id },
    include: {
      donations: { where: { reversedAt: null }, select: { amount: true } },
      confirmations: {
        where: { status: "ISSUED" },
        select: { issuedAt: true },
      },
    },
  });
  if (!donor) return null;

  const now = new Date();
  const retentionBlocked = donor.confirmations.some(
    (confirmation) => retentionEndDate(confirmation.issuedAt).getTime() > now.getTime(),
  );

  return {
    id: donor.id,
    donorNumber: donor.donorNumber,
    type: donor.type,
    displayName:
      donor.type === "ORGANIZATION"
        ? donor.organizationName ?? "-"
        : `${donor.lastName ?? ""}, ${donor.firstName ?? ""}`.replace(/^, |, $/g, "") || "-",
    city: donor.city,
    isActive: donor.isActive,
    isAnonymized: donor.isAnonymized,
    donationCount: donor.donations.length,
    totalCents: donor.donations.reduce(
      (sum, donation) => sum + Number(donation.amount.mul(100).toFixed(0)),
      0,
    ),
    firstName: donor.firstName,
    lastName: donor.lastName,
    organizationName: donor.organizationName,
    street: donor.street,
    postalCode: donor.postalCode,
    country: donor.country,
    email: donor.email,
    phone: donor.phone,
    memberId: donor.memberId,
    note: donor.note,
    createdAt: donor.createdAt,
    updatedAt: donor.updatedAt,
    retentionBlocked,
  };
}
