import { getTranslations } from "next-intl/server";
import { InventoryCategoriesView } from "../../views/inventory-categories-view";

export async function generateMetadata() {
  const t = await getTranslations("inventory.meta");
  return { title: t("categories") };
}

export default async function InventoryCategoriesPage() {
  return <InventoryCategoriesView />;
}
