import Link from "next/link";
import { Sparkles } from "lucide-react";

import { defineCards } from "@/shared/types/dashboard";

import { FinanceInsightCard } from "../components/finance-insight-card";
import { aiPermissions } from "../permissions";
import { hasAiConsent, isAiConfigured } from "../services/consent";

/**
 * AI durum analizi kartı. Varsayılan olarak muhasebe panosunun sağ üst köşesinde sabittir
 * (surfaces → "accounting.overview", placement "aside"); ana panele kullanıcı isterse ekler.
 * Muhasebe verisini okuma yetkisi her çağrıda AI araç kapılarında yeniden denetlenir.
 */
export const cards = defineCards([
  {
    key: "financeInsight",
    titleKey: "cards.financeInsight.title",
    descriptionKey: "cards.financeInsight.description",
    icon: Sparkles,
    size: "md",
    defaultVisible: false,
    surfaces: [{ key: "accounting.overview", placement: "aside" }],
    permission: { definition: aiPermissions, action: "view" },
    render: async ({ user, t }) => {
      if (!(await isAiConfigured()) || !(await hasAiConsent(user.id))) {
        return (
          <div className="space-y-2 text-sm text-ink-600">
            <p>{t("cards.financeInsight.setup")}</p>
            <Link href="/ayarlar/yapay-zeka" className="font-medium text-accent hover:underline">
              {t("cards.financeInsight.setupLink")}
            </Link>
          </div>
        );
      }
      const year = Number(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }).slice(0, 4));
      return <FinanceInsightCard year={year} />;
    },
  },
]);
