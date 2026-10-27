import "server-only";

import { getDb } from "@/shared/db";

import { MEMBERSHIP_TYPE_SELECT_OPTIONS } from "../constants";
import { decimalToCents } from "../services/dues-calculation";
import type { MemberTypeConfigRow } from "../types";

/**
 * Üyelik türü konfigürasyonları + üye sayıları (Faz 3 eklemeleri).
 * Konfigürasyon satırı yoksa (seed atlanmışsa) güvenli varsayılan döner:
 * tutar null (belirlenmedi), aktif true.
 */
export async function listMemberTypeConfigs(): Promise<MemberTypeConfigRow[]> {
  const db = getDb();

  const [configs, counts] = await Promise.all([
    db.membershipTypeConfig.findMany(),
    db.member.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const countByType = new Map(counts.map((row) => [row.type, row._count._all]));

  return MEMBERSHIP_TYPE_SELECT_OPTIONS.map(({ value }) => {
    const config = configs.find((row) => row.type === value);
    return {
      type: value,
      annualDueCents:
        config && config.annualDue !== null ? decimalToCents(config.annualDue) : null,
      isActive: config?.isActive ?? true,
      memberCount: countByType.get(value) ?? 0,
    };
  });
}
