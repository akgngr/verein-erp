import "server-only";

import { getDb } from "@/shared/db";

/**
 * Aktif (silinmemiş) üye kayıtlarını e-postaya göre bulur (büyük/küçük harf duyarsız).
 * Framework bağımsızdır: hem sunucu sayfaları hem worker (`@/modules/members/automation`) kullanır.
 */
export async function findMemberIdsByEmail(email: string): Promise<string[]> {
  const members = await getDb().member.findMany({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    select: { id: true },
  });
  return members.map((member) => member.id);
}
