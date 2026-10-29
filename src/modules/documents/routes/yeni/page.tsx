import { getTranslations } from "next-intl/server";
import { DocumentCreateView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("documents.meta");
  return { title: t("create") };
}

/** Yeni evrak — ince rota: yon parametresini view'a iletir. */
export default async function YeniEvrakPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DocumentCreateView searchParams={searchParams} />;
}
