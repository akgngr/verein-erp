import "server-only";

import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { secretaryPermissions } from "./permissions";
import type { FollowUpView } from "./services/follow-ups";

/** S4.2 (#314): kullanıcının kendi takipleri özetinde. Başlık yalnız sahibine; bağlantı kaynağın yetkili sayfası. */
export function buildFollowUpItems(rows: readonly FollowUpView[], context: Pick<SecretaryContext, "t">, today: string): BriefingItem[] {
  return rows.slice(0, 20).map((row) => ({
    id: `secretary:follow-up:${row.id}`,
    module: "secretary",
    kind: "follow-up",
    severity: row.dueOn < today ? "warning" as const : "info" as const,
    title: context.t(row.status === "EXHAUSTED" ? "secretary.followUpExhausted" : "secretary.followUpDue", { title: row.title.slice(0, 120) }),
    dueAt: row.dueOn,
    href: row.sourceHref,
  }));
}

export const secretary = defineModuleSecretary({
  module: "secretary",
  providers: [{
    key: "follow-ups",
    permission: { definition: secretaryPermissions, action: "view" },
    collect: async (context) => {
      const { dueFollowUpsFor } = await import("./services/follow-ups");
      const { berlinClock } = await import("./services/schedule");
      return buildFollowUpItems(await dueFollowUpsFor(context.user.id, context.now), context, berlinClock(context.now).date);
    },
  }],
});
