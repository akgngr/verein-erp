import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";
import { PackagePlus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ModuleList } from "../components/module-list";
import { getModulesList } from "../queries/get-modules";
import { areFileDevToolsEnabled } from "@/shared/modules/dev-tools";

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
        actions={
          <Link
            href="/ayarlar/moduller/paketler"
            className="inline-flex h-10 items-center gap-2 rounded-medium bg-primary px-4 text-small font-medium text-primary-foreground hover:opacity-90"
          >
            <PackagePlus size={16} aria-hidden /> {t("installModule")}
          </Link>
        }
      />

      <ModuleList
        initialModules={modules}
        stats={stats}
        canManage={canManage}
        devTools={areFileDevToolsEnabled()}
      />
    </div>
  );
}
