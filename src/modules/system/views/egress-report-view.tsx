import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { systemPermissions } from "@/shared/permissions/system";
import { getTranslations } from "next-intl/server";

import { EgressReportPanel } from "../components/egress-report-panel";

export async function EgressReportView() {
  try {
    await requirePermission(systemPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("system.egressUi");
  const now = new Date();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <EgressReportPanel
        idPrefix="system-egress-report"
        initialYear={now.getUTCFullYear()}
        initialMonth={now.getUTCMonth() + 1}
      />
    </div>
  );
}
