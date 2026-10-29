"use client";

import { useTranslations } from "next-intl";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { cn } from "@/shared/utils";

import type { DocumentStats } from "../types";

export type StatsCardsProps = {
  stats: DocumentStats;
  /** Karta tıklanınca uygulanacak tarih aralığı (bu ay, Europe/Berlin, YYYY-MM-DD). */
  monthFrom: string;
  monthTo: string;
};

type CardDefinition = {
  key: keyof DocumentStats;
  label: string;
  value: number;
  danger?: boolean;
  /** Tıklanınca URL'ye yazılacak filtre. */
  filter: Record<string, string>;
};

/**
 * Liste üstü istatistik kartları (8.1). Karta tıklayınca ilgili filtre URL'ye
 * uygulanır; aynı filtre zaten etkinse temizlenir (toggle).
 */
export function StatsCards({ stats, monthFrom, monthTo }: StatsCardsProps) {
  const t = useTranslations("documents.stats");
  const { setParams, isPending } = useListQueryState();

  const cards: CardDefinition[] = [
    { key: "open", label: t("open"), value: stats.open, filter: { "filter.status": "OPEN" } },
    {
      key: "inProgress",
      label: t("inProgress"),
      value: stats.inProgress,
      filter: { "filter.status": "IN_PROGRESS" },
    },
    {
      key: "overdue",
      label: t("overdue"),
      value: stats.overdue,
      danger: stats.overdue > 0,
      filter: { "filter.overdue": "1" },
    },
    {
      key: "incomingThisMonth",
      label: t("incomingThisMonth"),
      value: stats.incomingThisMonth,
      filter: { "filter.direction": "INCOMING", "filter.from": monthFrom, "filter.to": monthTo },
    },
    {
      key: "outgoingThisMonth",
      label: t("outgoingThisMonth"),
      value: stats.outgoingThisMonth,
      filter: { "filter.direction": "OUTGOING", "filter.from": monthFrom, "filter.to": monthTo },
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          disabled={isPending}
          onClick={() => setParams(card.filter, { resetPage: true })}
          className={cn(
            "flex flex-col items-start gap-1 rounded-medium border bg-content1 px-4 py-3 text-left shadow-sm transition-colors",
            card.filter ? "hover:border-primary-300 hover:bg-primary-50/40" : "cursor-default",
          )}
          aria-label={t("filterAria", { label: card.label, value: card.value })}
        >
          <span
            className={cn(
              "text-2xl font-semibold leading-none",
              card.danger ? "text-danger-600" : "text-foreground",
            )}
          >
            {card.value}
          </span>
          <span className="text-tiny text-default-500">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
