import { getTranslations } from "next-intl/server";
import { InventoryListView } from "./views/inventory-list-view";

export async function generateMetadata() {
  const t = await getTranslations("inventory.meta");
  return { title: t("list") };
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InventoryListView searchParams={searchParams} />;
}
