import { getTranslations } from "next-intl/server";
import { DocumentListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("documents.meta");
  return { title: t("list") };
}

/** Evrak listesi — ince rota (3.4): yalnızca searchParams'ı view'a iletir. */
export default async function EvrakPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DocumentListView searchParams={searchParams} />;
}
