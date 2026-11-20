import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/shared/components/ui/page-header";
import { getExchangeRates } from "../services/rates";
import { CurrencyDashboard } from "../components/currency-dashboard";

export async function FinanceView() {
  const [t, initialRates] = await Promise.all([
    getTranslations("finance"),
    getExchangeRates("EUR"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <CurrencyDashboard initialRates={initialRates} />
    </div>
  );
}
