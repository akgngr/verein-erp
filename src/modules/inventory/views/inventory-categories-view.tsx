import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/shared/components/ui/page-header";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { INVENTORY_CATEGORY_LABEL_KEYS } from "../constants";
import {
  buildCategoryFilterHref,
  formatNumber,
  sumCategorySummaries,
} from "../helpers/inventory-helpers";
import { getInventoryCategorySummary } from "../queries/list-inventory";
import { getInventoryAbilities } from "../services/inventory-service";

export async function InventoryCategoriesView() {
  const abilities = await getInventoryAbilities();

  if (!abilities.canView) {
    return <AccessDenied />;
  }

  const [t, locale, summary] = await Promise.all([
    getTranslations("inventory"),
    getLocale(),
    getInventoryCategorySummary(),
  ]);

  const totals = sumCategorySummaries(summary);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("categoriesPage.title")} description={t("categoriesPage.description")} />

      <div className="overflow-x-auto rounded-large border border-default-200/80 bg-content1 shadow-xs">
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-default-200/80 bg-default-100/70 text-left text-tiny font-semibold uppercase tracking-wider text-default-600">
              <th scope="col" className="px-4 py-3">
                {t("categoriesPage.columns.category")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("categoriesPage.columns.itemCount")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("categoriesPage.columns.totalQuantity")}
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">{t("categoriesPage.viewItems")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr
                key={row.category}
                className="border-b border-default-100 transition-colors hover:bg-default-50/70"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {t(INVENTORY_CATEGORY_LABEL_KEYS[row.category])}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(row.itemCount, locale)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(row.totalQuantity, locale)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={buildCategoryFilterHref(row.category)}
                    className="text-small font-medium text-primary hover:underline"
                  >
                    {t("categoriesPage.viewItems")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-default-50/50 font-semibold text-foreground">
              <td className="px-4 py-3">{t("categoriesPage.total")}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatNumber(totals.itemCount, locale)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatNumber(totals.totalQuantity, locale)}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
