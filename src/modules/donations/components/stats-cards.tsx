"use client";

import { useTranslations } from "next-intl";

import { StatCard } from "@/shared/components/ui/stat-card";
import type { DonationStats } from "../types";

/** Bağış istatistik kartları (§ 17). */
export function DonationStatsCards({ stats }: { stats: DonationStats }) {
  const t = useTranslations("donations.list.stats");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  const cards = [
    { label: t("total"), value: format(stats.totalCents), tone: "text-foreground" },
    { label: t("count"), value: String(stats.count), tone: "text-foreground" },
    {
      label: t("unconfirmed"),
      value: String(stats.unconfirmedOver300Count),
      tone: stats.unconfirmedOver300Count > 0 ? "text-warning" : "text-ink-500",
    },
    {
      label: t("issued"),
      value: String(stats.issuedConfirmationCount),
      tone: "text-foreground",
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          valueClassName={card.tone}
        />
      ))}
    </div>
  );
}
