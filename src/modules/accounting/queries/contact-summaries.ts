import "server-only";

import { getDb } from "@/shared/db";

export type ContactSummary = { id: string; type: string; number: number; name: string; contactPerson: string | null; email: string | null; phone: string | null; isActive: boolean };

const SELECT = { id: true, type: true, number: true, name: true, contactPerson: true, email: true, phone: true, isActive: true } as const;

/** Cari özetleri (CRM vb. modüller için; erişim onayıyla). Banka/vergi bilgisi dönmez. */
export async function getContactSummaries(ids: string[]): Promise<Map<string, ContactSummary>> {
  const unique = [...new Set(ids)].slice(0, 5000);
  if (!unique.length) return new Map();
  const rows = await getDb().accountingContact.findMany({ where: { id: { in: unique } }, select: SELECT });
  return new Map(rows.map((row) => [row.id, row]));
}

export async function searchContacts(query: string, take = 20): Promise<ContactSummary[]> {
  const q = query.trim().slice(0, 80);
  const number = /^\d+$/.test(q) ? Number(q) : null;
  return getDb().accountingContact.findMany({
    where: {
      isActive: true,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { contactPerson: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, ...(number ? [{ number }] : [])] } : {}),
    },
    select: SELECT,
    orderBy: { name: "asc" },
    take: Math.min(take, 50),
  });
}
