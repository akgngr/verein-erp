import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { listAllAccounts } from "../queries/list-accounts";
import { listAllCategories } from "../queries/list-categories";
import { listAllProjects } from "../queries/list-projects";
import { getSettings } from "../queries/get-settings";
import { accountingSetupPermissions } from "../permissions";
import { SetupTabs } from "../components/setup-tabs";

/** Ayarlar (§ 11.4): ?sekme=hesaplar|kategoriler|projeler + aktarım ayar kartı. */
export async function AccountingSetupView({
  tab,
}: {
  tab: "hesaplar" | "kategoriler" | "projeler";
}) {
  let user;
  try {
    user = await requirePermission(accountingSetupPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [accounts, categories, projects, settings] = await Promise.all([
    listAllAccounts(),
    listAllCategories(),
    listAllProjects(),
    getSettings(),
  ]);
  const t = await getTranslations("accounting.setup");

  const canUpdate = can(user.role, accountingSetupPermissions, "update");

  return (
    <div>
      <PageHeader title={t("title")} description={""} />
      <SetupTabs
        tab={tab}
        accounts={accounts}
        categories={categories}
        projects={projects}
        settings={settings}
        canUpdate={canUpdate}
      />
    </div>
  );
}
