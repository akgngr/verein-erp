import { AlertTriangle, FileText } from "lucide-react";

import { AlertCardBody, StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { defineCards } from "@/shared/types/dashboard";

import { documentsPermissions } from "../permissions";
import { getDocumentStats } from "../queries/get-document-stats";

export const cards = defineCards([
  {
    key: "overview",
    titleKey: "cards.overview.title",
    descriptionKey: "cards.overview.description",
    icon: FileText,
    size: "sm",
    defaultVisible: true,
    href: "/evrak",
    permission: { definition: documentsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getDocumentStats();
      return (
        <StatCardBody
          value={stats.open + stats.inProgress}
          label={t("cards.overview.open")}
          tone={stats.overdue > 0 ? "danger" : "default"}
          details={[
            { label: t("cards.overview.incomingMonth"), value: stats.incomingThisMonth },
            { label: t("cards.overview.outgoingMonth"), value: stats.outgoingThisMonth },
            ...(stats.overdue > 0
              ? [{ label: t("cards.overview.overdue"), value: stats.overdue, tone: "danger" as const }]
              : []),
          ]}
        />
      );
    },
  },
  {
    key: "overdue",
    titleKey: "cards.overdue.title",
    descriptionKey: "cards.overdue.description",
    icon: AlertTriangle,
    size: "lg",
    defaultVisible: true,
    permission: { definition: documentsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getDocumentStats();
      if (stats.overdue === 0) return null;
      return (
        <AlertCardBody
          message={t("cards.overdue.message", { count: stats.overdue })}
          actionHref="/evrak?filter.overdue=1"
          actionLabel={t("cards.overdue.action")}
        />
      );
    },
  },
]);
