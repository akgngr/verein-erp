import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";
import { getTranslations } from "next-intl/server";

import { ModuleList } from "../components/module-list";
import { getModulesList } from "../queries/get-modules";

export async function ModuleManagementView() {
  let user;
  try {
    user = await requirePermission(systemPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("system");
  const { modules, stats } = await getModulesList();
  const canManage = can(user.role, systemPermissions, "update");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <ModuleList
        initialModules={modules}
        stats={stats}
        canManage={canManage}
      />
    </div>
  );
}
