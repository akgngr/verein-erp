import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/shared/components/ui/page-header";
import { FinanceSettingsForm } from "../components/finance-settings-form";

export async function FinanceSettingsView() {
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
