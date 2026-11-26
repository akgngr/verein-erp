import "server-only";

import type { MembershipType } from "@prisma/client";

import { getDb } from "@/shared/db";

import type { MemberStats } from "../types";
import { berlinMonthRange } from "../utils";

/**
 * Panel ve liste üstü istatistikler: silinmemiş kayıtlar üzerinden.
 *
 * KARAR (#605): "Bu ay yeni üye" üyelik başlangıcı (joinDate) bazlıdır — toplu içe aktarma veya geç kayıt
 * (createdAt) sayıyı şişirmez; Europe/Berlin takvim ayı kullanılır.
 */
export async function getMemberStats(): Promise<MemberStats> {
  const db = getDb();
  const month = berlinMonthRange();

  const [active, passive, resigned, newThisMonth, byTypeGroups] = await Promise.all([
    db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.member.count({ where: { deletedAt: null, status: "PASSIVE" } }),
    db.member.count({ where: { deletedAt: null, status: "RESIGNED" } }),
    db.member.count({
      where: { deletedAt: null, joinDate: { gte: month.start, lt: month.end } },
    }),
    db.member.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);

  const allTypes: MembershipType[] = ["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"];
  const byType = allTypes.map((type) => ({
    type,
    count: byTypeGroups.find((g) => g.type === type)?._count ?? 0,
  }));

  return { active, passive, resigned, newThisMonth, byType };
}
