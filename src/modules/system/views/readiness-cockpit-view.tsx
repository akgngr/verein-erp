import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { systemPermissions } from "@/shared/permissions/system";
import { getTranslations } from "next-intl/server";

import { ReadinessCockpit } from "../components/readiness-cockpit";
import { getModuleReadinessReport } from "../services/readiness";

export async function ReadinessCockpitView() {
  try {
    await requirePermission(systemPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("system.readiness");
  const report = await getModuleReadinessReport();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />
      <ReadinessCockpit initialReport={report} />
    </div>
  );
}
