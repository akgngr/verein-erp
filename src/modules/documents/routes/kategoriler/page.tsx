import { getTranslations } from "next-intl/server";
import { CategoryListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("documents.meta");
  return { title: t("categories") };
}

/** Kategoriler — ince rota: searchParams'ı view'a iletir. */
export default async function KategorilerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CategoryListView searchParams={searchParams} />;
}
