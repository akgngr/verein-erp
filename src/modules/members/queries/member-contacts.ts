import "server-only";

import { getDb } from "@/shared/db";

export type MemberContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  /** Kampanya e-postası istemiyor (DSGVO Art. 21). */
  bulkMailOptOut: boolean;
  /** Açık rıza verilen mesaj kanalları. */
  messagingConsents: string[];
};

/**
 * Kampanya alıcıları için iletişim bilgisi (diğer modüller: toplantı katılımcıları vb.; erişim onayıyla).
 * Silinmiş üyeler dönmez; itiraz ve kanal izinleri birlikte döner ki çağıran kuralları uygulayabilsin.
 */
export async function getMemberContacts(ids: string[]): Promise<Map<string, MemberContact>> {
  const unique = [...new Set(ids)].slice(0, 5000);
  if (!unique.length) return new Map();
  const rows = await getDb().member.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, bulkMailOptOut: true, messagingConsents: true },
  });
  return new Map(rows.map((row) => [row.id, row]));
}

/** CRM / seçiciler için ad, üye no veya e-postaya göre arama (silinmişler hariç). */
export async function searchMemberContacts(query: string, take = 20): Promise<(MemberContact & { membershipNumber: string })[]> {
  const q = query.trim().slice(0, 80);
  return getDb().member.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { membershipNumber: { contains: q, mode: "insensitive" } }] } : {}),
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, bulkMailOptOut: true, messagingConsents: true, membershipNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: Math.min(take, 50),
  });
}
