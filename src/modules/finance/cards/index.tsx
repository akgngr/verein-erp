import { TrendingUp } from "lucide-react";

import { defineCards } from "@/shared/types/dashboard";
import { financePermissions } from "../permissions";
import { getExchangeRates } from "../services/rates";

export const cards = defineCards([
  {
    key: "rates",
    titleKey: "cards.rates.title",
    descriptionKey: "cards.rates.description",
    icon: TrendingUp,
    size: "md",
    defaultVisible: true,
    href: "/finance",
    permission: { definition: financePermissions, action: "view" },
    render: async ({ t }) => {
      const data = await getExchangeRates("EUR");
      const { FinanceCardBody } = await import("./finance-card-body");
      return <FinanceCardBody initialRates={data} t={t} />;
    },
  },
]);
