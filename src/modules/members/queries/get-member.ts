import "server-only";

import type { Role } from "@/shared/roles";

import { getDb } from "@/shared/db";

import type { MemberDetail } from "../types";
import { maskKimlikNo } from "../services/kimlik";
import { formatAddress } from "../utils";

/**
 * Üye detayı — get-member çıktısı.
 *
 * KARAR (Verein pivotu): kimlikNo alanı role göre maskelenir — VIEWER yanıtta
 * bu alanı GÖREMEZ (null döner). Adres alanları (street/houseNumber/postalCode/
 * city/state) Alman adres yapısına göre yapılandırıldı; formatAddress
 * yardımcısıyla "Straße Hausnr, PLZ Stadt (Bundesland)" biçiminde
 * birleştirilir (addressFormatted).
 */
export async function getMember(
  id: string,
  role: Role,
): Promise<MemberDetail | null> {
  const db = getDb();
  const member = await db.member.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      membershipNumber: true,
      type: true,
      status: true,
      firstName: true,
      lastName: true,
      kimlikNo: true,
      email: true,
      phone: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      state: true,
      country: true,
      cancellationReceivedAt: true,
      birthDate: true,
      profession: true,
      joinDate: true,
      exitDate: true,
      exitReason: true,
      notes: true,
      bulkMailOptOut: true,
      createdById: true,
      createdByLabel: true,
      createdAt: true,
      updatedById: true,
      updatedByLabel: true,
      updatedAt: true,
      memberNotes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, authorLabel: true, createdAt: true },
      },
    },
  });

  if (!member) return null;

  const addressFormatted = formatAddress({
    street: member.street,
    houseNumber: member.houseNumber,
    postalCode: member.postalCode,
    city: member.city,
    state: member.state,
  });

  return {
    id: member.id,
    membershipNumber: member.membershipNumber,
    type: member.type,
    status: member.status,
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: `${member.firstName} ${member.lastName}`,
    kimlikNo: maskKimlikNo(role, member.kimlikNo),
    email: member.email,
    phone: member.phone,
    street: member.street,
    houseNumber: member.houseNumber,
    postalCode: member.postalCode,
    city: member.city,
    state: member.state,
    country: member.country,
    cancellationReceivedAt: member.cancellationReceivedAt,
    addressFormatted,
    birthDate: member.birthDate,
    profession: member.profession,
    joinDate: member.joinDate,
    exitDate: member.exitDate,
    exitReason: member.exitReason,
    notes: member.notes,
    bulkMailOptOut: member.bulkMailOptOut,
    createdById: member.createdById,
    createdByLabel: member.createdByLabel,
    createdAt: member.createdAt,
    updatedById: member.updatedById,
    updatedByLabel: member.updatedByLabel,
    updatedAt: member.updatedAt,
    memberNotes: member.memberNotes.map((n) => ({
      id: n.id,
      body: n.body,
      authorLabel: n.authorLabel,
      createdAt: n.createdAt,
    })),
  };
}
