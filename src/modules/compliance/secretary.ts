import "server-only";

import { defineModuleSecretary, type BriefingItem } from "@/shared/secretary/define";

import { compliancePermissions } from "./permissions";
import { runCockpit } from "./services/run";

/** Morning briefing: counts only (no names, no amounts) of triggered reviewed findings for the current year. */
export const secretary = defineModuleSecretary({
  module: "compliance",
  providers: [
    {
      key: "findings",
      permission: { definition: compliancePermissions, action: "view" },
      collect: async (context): Promise<BriefingItem[]> => {
        const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(context.now));
        const rows = await runCockpit(context.user, { year, now: context.now });
        const triggered = rows.flatMap((row) => row.findings).filter((finding) => finding.status === "triggered");
        if (!triggered.length) return [];
        const critical = triggered.filter((finding) => finding.severity === "critical").length;
        return [{
          id: `compliance:findings:${year}`,
          module: "compliance",
          kind: "findings",
          severity: critical ? "danger" : "warning",
          title: context.t("secretary.findings", { count: triggered.length }),
          detail: context.t("secretary.disclaimer"),
          count: triggered.length,
          href: "/compliance",
        }];
      },
    },
  ],
});
