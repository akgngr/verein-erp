/** Toplu e-posta yer tutucuları (saf). Bilinmeyen yer tutucular olduğu gibi kalır. */
export const MAILING_PLACEHOLDERS = ["firstName", "lastName", "fullName", "membershipNumber"] as const;
export type MailingVars = Record<(typeof MAILING_PLACEHOLDERS)[number], string>;

export function renderMailingTemplate(text: string, vars: MailingVars): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key as keyof MailingVars] : match));
}

export function mailingVars(member: { firstName: string; lastName: string; membershipNumber: string }): MailingVars {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: `${member.firstName} ${member.lastName}`.trim(),
    membershipNumber: member.membershipNumber,
  };
}
