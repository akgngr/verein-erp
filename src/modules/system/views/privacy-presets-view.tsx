import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";
import { getTranslations } from "next-intl/server";

import { PrivacyPresetsPanel } from "../components/privacy-presets-panel";

export async function PrivacyPresetsView() {
  let user;
  try {
    user = await requirePermission(systemPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("system.privacyUi");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <PrivacyPresetsPanel idPrefix="system-privacy-presets" canManage={can(user.role, systemPermissions, "update")} />
    </div>
  );
}
