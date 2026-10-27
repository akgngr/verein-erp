"use client";

import { Card, CardBody } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { DonationStats } from "../types";

/** Bağış istatistik kartları (§ 17). */
export function DonationStatsCards({ stats }: { stats: DonationStats }) {
  const t = useTranslations("donations.list.stats");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const cards = [
    { label: t("total"), value: format(stats.totalCents), tone: "text-foreground" },
    { label: t("count"), value: String(stats.count), tone: "text-foreground" },
    {
      label: t("unconfirmed"),
      value: String(stats.unconfirmedOver300Count),
      tone: stats.unconfirmedOver300Count > 0 ? "text-warning" : "text-default-500",
    },
    { label: t("issued"), value: String(stats.issuedConfirmationCount), tone: "text-foreground" },
  ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} shadow="sm">
          <CardBody className="px-4 py-3">
            <p className="text-tiny uppercase tracking-wide text-default-400">{card.label}</p>
            <p className={`text-medium font-semibold ${card.tone}`}>{card.value}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
