import "server-only";

import { getDb } from "@/shared/db";

/**
 * Uzaktan form (online-forms modülü) için üyenin kendisinin tamamlayabileceği alanlar. Kimlik no,
 * üyelik türü/durumu ve notlar verilmez, değiştirilemez.
 */
export type MemberSelfService = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  birthDate: string | null;
  profession: string | null;
  messagingConsents: string[];
  bulkMailOptOut: boolean;
  photoConsent: boolean;
};

export type MemberSelfServiceInput = Omit<MemberSelfService, "id" | "firstName" | "lastName" | "membershipNumber">;

export async function getMemberSelfService(id: string): Promise<MemberSelfService | null> {
  const row = await getDb().member.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, membershipNumber: true, email: true, phone: true, street: true, houseNumber: true, postalCode: true, city: true, state: true, country: true, birthDate: true, profession: true, messagingConsents: true, bulkMailOptOut: true, photoConsent: true },
  });
  return row ? { ...row, birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null } : null;
}

/** Kişinin imzaladığı formu uygular; Datenschutz onay günü kaydedilir. */
export async function applyMemberSelfService(id: string, input: MemberSelfServiceInput, signedAt: Date, label: string): Promise<boolean> {
  const result = await getDb().member.updateMany({
    where: { id, deletedAt: null },
    data: {
      ...input,
      birthDate: input.birthDate ? new Date(`${input.birthDate}T00:00:00Z`) : null,
      privacyConsentAt: signedAt,
      updatedById: null,
      updatedByLabel: label,
    },
  });
  return result.count === 1;
}
