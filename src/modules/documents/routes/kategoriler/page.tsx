import { CategoryListView } from "../../ui";

export const metadata = { title: "Evrak Kategorileri" };

/** Kategoriler — ince rota: searchParams'ı view'a iletir. */
export default async function KategorilerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CategoryListView searchParams={searchParams} />;
}
