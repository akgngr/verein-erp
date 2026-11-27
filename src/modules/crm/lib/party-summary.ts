/**
 * #582: CRM kişi özetinin kaynak verisinden kurulması (saf fonksiyon; servis veriyi toplu okur).
 * - Kaynak modül kullanılabilir ama rol onu göremiyorsa: "restricted" (ad yerine çevrilmiş etiket, iletişim yok).
 * - Kaynak modül kapalı veya kayıt silinmişse: "missing".
 */
export type PartySummary = {
  name: string;
  detail: string;
  email: string | null;
  phone: string | null;
  missing: boolean;
  /** Görüntüleyen kaynak modülün kişi verisini görme iznine sahip değil. */
  restricted: boolean;
};

export type MemberContactLite = { firstName: string; lastName: string; email: string | null; phone: string | null };
export type AccountingContactLite = { name: string; contactPerson: string | null; email: string | null; phone: string | null };

export type PartySummaryContext = {
  usable: ReadonlySet<string>;
  readable: ReadonlySet<string>;
  members: ReadonlyMap<string, MemberContactLite>;
  contacts: ReadonlyMap<string, AccountingContactLite>;
  restrictedLabel: string;
};

export const MISSING_PARTY: PartySummary = { name: "—", detail: "", email: null, phone: null, missing: true, restricted: false };

export function summarizeParty(row: { sourceModule: string; sourceId: string }, ctx: PartySummaryContext): PartySummary {
  if (ctx.usable.has(row.sourceModule) && !ctx.readable.has(row.sourceModule)) {
    return { name: ctx.restrictedLabel, detail: "", email: null, phone: null, missing: false, restricted: true };
  }
  if (!ctx.readable.has(row.sourceModule)) return MISSING_PARTY;
  if (row.sourceModule === "members") {
    const member = ctx.members.get(row.sourceId);
    return member
      ? { name: `${member.firstName} ${member.lastName}`.trim(), detail: "", email: member.email, phone: member.phone, missing: false, restricted: false }
      : MISSING_PARTY;
  }
  const contact = ctx.contacts.get(row.sourceId);
  return contact
    ? { name: contact.name, detail: contact.contactPerson ?? "", email: contact.email, phone: contact.phone, missing: false, restricted: false }
    : MISSING_PARTY;
}
