import "server-only";

import type { MembershipType, Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";

import { MEMBERSHIP_TYPE_VALUES } from "../constants";
import { decimalToCents } from "../services/dues-calculation";
import type { MemberTypeConfigRow } from "../types";

/**
 * Üyelik türü konfigürasyonları + üye sayıları (Faz 3 eklemeleri).
 * Konfigürasyon satırı yoksa (seed atlanmışsa veya henüz migrate edilmemişse)
 * güvenli varsayılan döner: tutar null (belirlenmedi), aktif true.
 */
export async function listMemberTypeConfigs(): Promise<MemberTypeConfigRow[]> {
  const db = getDb();

  let configs: Array<{ type: MembershipType; annualDue: Prisma.Decimal | null; isActive: boolean }> = [];
  let counts: Array<{ type: MembershipType; _count: { _all: number } }> = [];

  try {
    const results = await Promise.all([
      db.membershipTypeConfig.findMany(),
      db.member.groupBy({
        by: ["type"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    configs = results[0];
    counts = results[1];
  } catch (err) {
    console.warn("Failed to load MembershipTypeConfig, falling back to defaults:", err);
  }

  const countByType = new Map(counts.map((row) => [row.type, row._count._all]));

  return MEMBERSHIP_TYPE_VALUES.map((value) => {
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
