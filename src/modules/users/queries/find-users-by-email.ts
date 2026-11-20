import "server-only";

import { getDb } from "@/shared/db";

/** E-postaya göre ETKİN kullanıcı kimlikleri (bildirim alıcısı eşleme; büyük/küçük harf duyarsız). */
export async function findActiveUserIdsByEmails(emails: readonly string[]): Promise<string[]> {
  const unique = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))].slice(0, 500);
  if (!unique.length) return [];
  const rows = await getDb().user.findMany({ where: { isActive: true, email: { in: unique, mode: "insensitive" } }, select: { id: true } });
  return rows.map((row) => row.id);
}
