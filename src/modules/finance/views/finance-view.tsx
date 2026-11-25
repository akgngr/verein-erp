import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { financePermissions } from "../permissions";
import { getExchangeRates } from "../services/rates";
import { CurrencyDashboard } from "../components/currency-dashboard";

/** #582: Sayfa sunucuda `finance.view` ister. */
export async function FinanceView() {
  try {
    await requirePermission(financePermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
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
