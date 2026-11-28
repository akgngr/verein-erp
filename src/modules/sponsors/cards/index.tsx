import { Handshake } from "lucide-react";

import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { formatMoney } from "@/shared/money";
import { defineCards } from "@/shared/types/dashboard";

import { sponsorsPermissions } from "../permissions";
import { getSponsorSummary } from "../queries/list-sponsors";

export const cards = defineCards([
  {
    key: "overview",
    titleKey: "cards.overview.title",
    descriptionKey: "cards.overview.description",
    icon: Handshake,
    size: "sm",
    defaultVisible: true,
    href: "/sponsors",
    permission: { definition: sponsorsPermissions, action: "view" },
    render: async ({ t }) => {
      const summary = await getSponsorSummary();
      return (
        <StatCardBody
          value={summary.activeCount}
          label={t("cards.overview.active")}
          details={[
            { label: t("cards.overview.activeAmount"), value: formatMoney(summary.activeAmountCents) },
            { label: t("cards.overview.leads"), value: summary.leadCount },
            { label: t("cards.overview.total"), value: summary.totalCount },
          ]}
        />
      );
    },
  },
]);
