import { InventoryListView } from "./views/inventory-list-view";

export const metadata = {
  title: "Envanter — Verein ERP",
  description: "Dernek demirbaş ve malzeme takibi.",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InventoryListView searchParams={searchParams} />;
}
