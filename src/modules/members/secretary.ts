import "server-only";

import { getDb } from "@/shared/db";
import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { memberPaymentsPermissions } from "./permissions";
import { berlinToday } from "./utils";

export type MembersSnapshot = { overdueDues: number };

/** Vadesi geçmiş aidatlar. Yalnız sayı; üye adı veya tutar dökümü özete taşınmaz. */
export function buildMemberItems(snapshot: MembersSnapshot, context: Pick<SecretaryContext, "t">): BriefingItem[] {
  if (snapshot.overdueDues <= 0) return [];
  return [{
    id: "members:overdue-dues",
    module: "members",
    kind: "overdue-dues",
    severity: "warning",
    title: context.t("secretary.overdueDues", { count: snapshot.overdueDues }),
    count: snapshot.overdueDues,
    href: "/uyeler/aidat",
  }];
}

export const secretary = defineModuleSecretary({
  module: "members",
  providers: [{
    key: "dues",
    // Aidat verisi ayrı yetkiye bağlı (VIEWER üyeleri görür ama aidatları görmez).
    permission: { definition: memberPaymentsPermissions, action: "view" },
    collect: async (context) => {
      const today = berlinToday(context.now);
      const overdueDues = await getDb().memberDue.count({ where: { status: { in: ["OPEN", "PARTIAL"] }, dueDate: { lt: today } } });
      return buildMemberItems({ overdueDues }, context);
    },
  }],
});
