import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/ui/page-header";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { INVENTORY_BASE_PATH } from "../constants";
import {
  formatNumber,
  hasActiveInventoryFilters,
  isCreateModalRequested,
  parseInventoryFilters,
} from "../helpers/inventory-helpers";
import { getInventoryStats, listInventoryItems } from "../queries/list-inventory";
import { getInventoryAbilities } from "../services/inventory-service";
import { InventoryCreateModal } from "../components/inventory-create-modal";
import { InventoryTable } from "../components/inventory-table";
import type { InventorySearchParams } from "../types";

interface InventoryListViewProps {
  searchParams: Promise<InventorySearchParams>;
}

export async function InventoryListView({ searchParams }: InventoryListViewProps) {
  const params = await searchParams;
  const abilities = await getInventoryAbilities();

  if (!abilities.canView) {
    return <AccessDenied />;
  }

  const filters = parseInventoryFilters(params);
  const [t, locale, result, stats] = await Promise.all([
    getTranslations("inventory"),
    getLocale(),
    listInventoryItems(filters),
    getInventoryStats(),
  ]);

  const isInventoryEmpty = stats.itemCount === 0 && !hasActiveInventoryFilters(filters);
  const isCreateOpen = abilities.canCreate && isCreateModalRequested(params);

  const statCards = [
    {
      key: "total",
      label: t("stats.totalQuantity"),
      value: formatNumber(stats.totalQuantity, locale),
      hint: t("stats.itemCount", { count: stats.itemCount }),
      accent: "text-foreground",
    },
    {
      key: "inUse",
      label: t("stats.inUse"),
      value: formatNumber(stats.inUseQuantity, locale),
      hint: t("statuses.IN_USE"),
      accent: "text-success",
    },
    {
      key: "broken",
      label: t("stats.broken"),
      value: formatNumber(stats.brokenQuantity, locale),
      hint: t("statuses.BROKEN"),
      accent: "text-danger",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          abilities.canCreate ? (
            <Link
              href={`${INVENTORY_BASE_PATH}?action=new`}
              scroll={false}
              className="inline-flex h-10 items-center gap-2 rounded-medium bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("newItem")}
            </Link>
          ) : undefined
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label={t("stats.title")}>
        {statCards.map((card) => (
          <div
            key={card.key}
            className="rounded-large border border-default-200 bg-content1 p-4 shadow-small"
          >
            <p className="text-small text-default-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${card.accent}`}>
              {card.value}
            </p>
            <p className="mt-1 text-tiny text-default-400">{card.hint}</p>
          </div>
        ))}
      </section>

      {isInventoryEmpty ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <InventoryTable result={result} filters={filters} abilities={abilities} locale={locale} />
      )}

      {abilities.canCreate ? <InventoryCreateModal isOpen={isCreateOpen} /> : null}
    </div>
  );
}
