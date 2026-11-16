import { cache } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { getDb } from "@/shared/db";
import { formatMoney } from "@/shared/money";
import { defineCards } from "@/shared/types/dashboard";

import { accountingPermissions } from "../permissions";
import { getAccountingStats } from "../queries/get-accounting-stats";
import { berlinYear } from "../utils";

/**
 * ACC-9: Uses the same booking totals as the accounting list.
 * React cache shares the expensive aggregation across cards in one server request.
 * No new dashboard registry or persistent widget settings are required.
 */
const getSummary = cache(async (year: number) => {
  const [stats, bookingCount] = await Promise.all([
    getAccountingStats(year),
    getDb().accountingBooking.count({
      where: { year, reversedAt: null, type: { not: "TRANSFER" } },
    }),
  ]);
  return { stats, bookingCount };
});

export const cards = defineCards([
  {
    key: "income",
    titleKey: "cards.income.title",
    descriptionKey: "cards.income.description",
    icon: ArrowUpRight,
    size: "sm",
    defaultVisible: false,
    href: "/muhasebe",
    permission: { definition: accountingPermissions, action: "view" },
    render: async ({ t }) => {
      const year = berlinYear(new Date());
      const { stats, bookingCount } = await getSummary(year);
      if (!bookingCount) return null;
      return (
        <StatCardBody
          value={formatMoney(stats.incomeCents)}
          label={t("cards.income.period", { year })}
        />
      );
    },
  },
  {
    key: "expense",
    titleKey: "cards.expense.title",
    descriptionKey: "cards.expense.description",
    icon: ArrowDownRight,
    size: "sm",
    defaultVisible: false,
    href: "/muhasebe",
    permission: { definition: accountingPermissions, action: "view" },
    render: async ({ t }) => {
      const year = berlinYear(new Date());
      const { stats, bookingCount } = await getSummary(year);
      if (!bookingCount) return null;
      return (
        <StatCardBody
          value={formatMoney(stats.expenseCents)}
          label={t("cards.expense.period", { year })}
        />
      );
    },
  },
  {
    key: "balance",
    titleKey: "cards.balance.title",
    descriptionKey: "cards.balance.description",
    icon: Scale,
    size: "sm",
    defaultVisible: false,
    href: "/muhasebe",
    permission: { definition: accountingPermissions, action: "view" },
    render: async ({ t }) => {
      const year = berlinYear(new Date());
      const { stats, bookingCount } = await getSummary(year);
      if (!bookingCount) return null;
      return (
        <StatCardBody
          value={formatMoney(stats.netCents)}
          label={t("cards.balance.period", { year })}
          tone={stats.netCents < 0 ? "danger" : "default"}
        />
      );
    },
  },
  {
    key: "missingReceipts",
    titleKey: "cards.missingReceipts.title",
    descriptionKey: "cards.missingReceipts.description",
    icon: AlertTriangle,
    size: "sm",
    defaultVisible: false,
    href: "/muhasebe",
    permission: { definition: accountingPermissions, action: "view" },
    render: async ({ t }) => {
      const year = berlinYear(new Date());
      const { stats } = await getSummary(year);
      if (stats.missingReceiptCount === 0) return null;
      return (
        <StatCardBody
          value={stats.missingReceiptCount}
          label={t("cards.missingReceipts.period", { year })}
          tone="warning"
        />
      );
    },
  },
]);
