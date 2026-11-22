import "server-only";

import { getDb } from "@/shared/db";
import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { youthProtectionPermissions } from "./permissions";

function getThreeMonthsAhead(now: Date): Date {
  const target = new Date(now);
  target.setMonth(target.getMonth() + 3);
  return target;
}

/**
 * Çocuk ve genç koruma (§ 72a SGB VIII) ibraz hatırlatıcıları.
 * YASAL VE GİZLİLİK SINIRI: Özetlerde ve başlıklarda KESİNLİKLE kişi adı veya kişisel veri yer almaz;
 * yalnızca süresi dolan veya 3 ay içinde dolacak toplam kayıt sayısı gösterilir.
 * Faaliyeti sonlanmış (activityEndedAt belirlenmiş) kişiler hatırlatıcıya dahil edilmez.
 */
export async function buildYouthProtectionBriefing(context: SecretaryContext): Promise<BriefingItem[]> {
  try {
    const targetDate = getThreeMonthsAhead(context.now);
    const count = await getDb().youthProtectionRecord.count({
      where: {
        activityEndedAt: null,
        nextDueDate: {
          lte: targetDate,
        },
      },
    });

    if (count <= 0) {
      return [];
    }

    const items: BriefingItem[] = [
      {
        id: "youth-protection:due-records",
        module: "youth-protection",
        kind: "compliance-due",
        severity: "warning",
        title: context.t("secretary.dueCount", { count }),
        count,
        href: "/youth-protection",
      },
    ];

    return items;
  } catch {
    return [];
  }
}

export const secretary = defineModuleSecretary({
  module: "youth-protection",
  providers: [
    {
      key: "due-inspections",
      permission: { definition: youthProtectionPermissions, action: "view" },
      collect: async (context) => buildYouthProtectionBriefing(context),
    },
  ],
});
