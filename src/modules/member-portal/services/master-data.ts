import "server-only";

import { getMember } from "@/modules/members/server";

import { maskIban } from "./auth-core";

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
  const member = await getMember(subjectRef, "SECRETARY");
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
    maskedIban: maskIban(null),
  };
}
