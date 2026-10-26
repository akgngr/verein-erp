import "server-only";

import { getDb } from "@/shared/db";

import type { ReplyTargetOption } from "../types";

/**
 * "Yanıtlanan evrak" seçici araması (8.2): yalnızca GELEN, silinmemiş evraklar.
 * Kendi kendine bağlamayı önlemek için excludeId (düzenlemede evrakın kendi ID'si)
 * sonuçlardan çıkarılır.
 */
export async function searchReplyTargets(
  q: string,
  excludeId?: string,
  limit = 20,
): Promise<ReplyTargetOption[]> {
  const rows = await getDb().document.findMany({
    where: {
      deletedAt: null,
      direction: "INCOMING",
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(q
        ? {
            OR: [
              { registryNumber: { contains: q, mode: "insensitive" } },
              { counterparty: { contains: q, mode: "insensitive" } },
              { subject: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      registryNumber: true,
      counterparty: true,
      subject: true,
      documentDate: true,
    },
    orderBy: { registeredAt: "desc" },
    take: limit,
  });
  return rows;
}
