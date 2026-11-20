import { getTranslations } from "next-intl/server";

import { FinanceView } from "./views/finance-view";

export async function generateMetadata() {
  const t = await getTranslations("finance.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function FinancePage() {
  return <FinanceView />;
}
