import "server-only";

import { getMember, getMemberMandate } from "@/modules/members/server";

import { parseSubjectRef } from "./subject-ref";

export type PortalMasterData = {
  id: string;
  memberNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  maskedIban: string | null;
};

/**
 * Returns ONLY the authenticated portal subject's own read-only master data
 * with masked IBAN. Never returns another member's data.
 */
export async function getPortalMasterData(subjectRef: string): Promise<PortalMasterData | null> {
  // #580: Özne "member:<id>" biçimindedir; önceden ham değer üye kimliği gibi kullanılıyordu.
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return null;
  const [member, mandate] = await Promise.all([getMember(parsed.id, "SECRETARY"), getMemberMandate(parsed.id)]);
  if (!member) return null;

  return {
    id: member.id,
    memberNumber: member.membershipNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    street: member.street,
    houseNumber: member.houseNumber,
    postalCode: member.postalCode,
    city: member.city,
    status: member.status,
    // #580: Gerçek SEPA IBAN'ı maskeli (yalnız ilk 4 ve son 4 karakter); önceden her zaman boştu.
    maskedIban: mandate?.ibanMasked ?? null,
  };
}
