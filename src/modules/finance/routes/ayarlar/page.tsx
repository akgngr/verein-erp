import { getTranslations } from "next-intl/server";

import { FinanceSettingsView } from "../../views/finance-settings-view";

export async function generateMetadata() {
  const t = await getTranslations("finance.settings");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function FinanceSettingsPage() {
  return <FinanceSettingsView />;
}
