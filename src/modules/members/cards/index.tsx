import { Gauge, Users } from "lucide-react";

import { GaugeCardBody, StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { formatMoney } from "@/shared/money";
import { defineCards } from "@/shared/types/dashboard";

import { memberPaymentsPermissions, membersPermissions } from "../permissions";
import { getDuesStats } from "../queries/get-dues-stats";
import { getMemberStats } from "../queries/get-member-stats";
import { berlinYear } from "../utils";

export const cards = defineCards([
  {
    key: "members",
    titleKey: "cards.members.title",
    descriptionKey: "cards.members.description",
    icon: Users,
    size: "sm",
    defaultVisible: true,
    href: "/uyeler",
    permission: { definition: membersPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getMemberStats();
      return (
        <StatCardBody
          value={stats.active}
          label={t("cards.members.active")}
          details={[
            { label: t("cards.members.newThisMonth"), value: stats.newThisMonth },
            { label: t("cards.members.passive"), value: stats.passive },
            { label: t("cards.members.resigned"), value: stats.resigned },
          ]}
        />
      );
    },
  },
  {
    key: "duesCollection",
    titleKey: "cards.duesCollection.title",
    descriptionKey: "cards.duesCollection.description",
    icon: Gauge,
    size: "sm",
    href: "/uyeler/aidat",
    permission: { definition: memberPaymentsPermissions, action: "view" },
    render: async ({ t }) => {
      const year = berlinYear(new Date());
      const stats = await getDuesStats(year);
      return (
        <GaugeCardBody
          percent={stats.collectionRate}
          label={t("cards.duesCollection.rate", { year })}
          caption={t("cards.duesCollection.caption", {
            collected: formatMoney(stats.collectedCents),
            expected: formatMoney(stats.expectedCents),
          })}
          details={[
            { label: t("cards.duesCollection.open"), value: stats.openCount + stats.partialCount },
            ...(stats.overdueCount > 0
              ? [{ label: t("cards.duesCollection.overdue"), value: stats.overdueCount, tone: "danger" as const }]
              : []),
          ]}
        />
      );
    },
  },
]);
