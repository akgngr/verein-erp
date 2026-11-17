"use client";

import { useTranslations } from "next-intl";

import { StatCard } from "@/shared/components/ui/stat-card";

/** Liste istatistik kartları (§ 11.1): gelir/gider/fark/eksik belge. */
export function StatsCards({
  incomeCents,
  expenseCents,
  missingReceiptCount,
}: {
  incomeCents: number;
  expenseCents: number;
  missingReceiptCount: number;
}) {
  const t = useTranslations("accounting.list.stats");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t("income")} value={format(incomeCents)} valueClassName="text-success" />
      <StatCard label={t("expense")} value={format(expenseCents)} valueClassName="text-danger" />
      <StatCard
        label={t("net")}
        value={format(incomeCents - expenseCents)}
        valueClassName={incomeCents - expenseCents >= 0 ? "text-success" : "text-danger"}
      />
      <StatCard
        label={t("missingReceipt")}
        value={missingReceiptCount}
        valueClassName={missingReceiptCount > 0 ? "text-warning" : "text-ink-500"}
      />
    </div>
  );
}
