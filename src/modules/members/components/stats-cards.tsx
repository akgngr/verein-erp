"use client";

import { useTranslations } from "next-intl";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { cn } from "@/shared/utils";

import type { MemberStats } from "../types";

export type StatsCardsProps = {
  stats: MemberStats;
  /** Karta tıklanınca uygulanacak tarih aralığı (bu ay, Europe/Berlin, YYYY-MM-DD). */
  monthFrom: string;
  monthTo: string;
};

type CardDefinition = {
  key: "active" | "passive" | "resigned" | "newThisMonth";
  label: string;
  value: number;
  filter: Record<string, string>;
};

/**
 * Liste üstü istatistik kartları. Karta tıklayınca ilgili filtre URL'ye
 * uygulanır; aynı filtre zaten etkinse temizlenir (toggle).
 */
export function StatsCards({ stats, monthFrom, monthTo }: StatsCardsProps) {
  const { setParams, isPending } = useListQueryState();
  const t = useTranslations("members");

  const cards: CardDefinition[] = [
    { key: "active", label: t("stats.active"), value: stats.active, filter: { "filter.status": "ACTIVE" } },
    { key: "passive", label: t("stats.passive"), value: stats.passive, filter: { "filter.status": "PASSIVE" } },
    { key: "resigned", label: t("stats.resigned"), value: stats.resigned, filter: { "filter.status": "RESIGNED" } },
    {
      key: "newThisMonth",
      label: t("stats.newThisMonth"),
      value: stats.newThisMonth,
      filter: { "filter.from": monthFrom, "filter.to": monthTo },
    },
  ];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            disabled={isPending}
            onClick={() => setParams(card.filter, { resetPage: true })}
            className={cn(
              "flex flex-col items-start gap-1 rounded-medium border bg-content1 px-4 py-3 text-left shadow-sm transition-colors",
              "hover:border-primary-300 hover:bg-primary-50/40",
            )}
            aria-label={`${card.label}: ${card.value} — ${t("stats.applyFilter")}`}
          >
            <span className="text-2xl font-semibold leading-none text-foreground">
              {card.value}
            </span>
            <span className="text-tiny text-default-500">{card.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-tiny font-medium text-default-500">{t("stats.byType")}</span>
        {stats.byType.map((row) => (
          <span
            key={row.type}
            className="inline-flex items-center gap-1 rounded-full bg-default-100 px-2.5 py-0.5 text-tiny text-default-700"
          >
            <span className="font-medium">{t(`type.${row.type}`)}</span>
            <span className="text-default-500">·</span>
            <span>{row.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
