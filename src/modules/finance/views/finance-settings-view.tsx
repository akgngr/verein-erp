import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { financePermissions } from "../permissions";
import { FinanceSettingsForm } from "../components/finance-settings-form";

/** #582: Ayarlar yalnız `finance.approve` (ADMIN, TREASURER); VIEWER doğrudan URL ile açamaz. */
export async function FinanceSettingsView() {
  try {
    await requirePermission(financePermissions, "approve");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("finance.settings");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <FinanceSettingsForm />
    </div>
  );
}
