import { InventoryCategoriesView } from "../../views/inventory-categories-view";

export const metadata = {
  title: "Envanter Kategorileri — Verein ERP",
  description: "Kategori bazında demirbaş özeti.",
};

export default async function InventoryCategoriesPage() {
  return <InventoryCategoriesView />;
}
