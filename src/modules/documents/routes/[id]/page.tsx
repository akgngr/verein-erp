import { getTranslations } from "next-intl/server";
import { DocumentDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("documents.meta");
  return { title: t("detail") };
}

/** Evrak detayı — ince rota: id'yi view'a iletir. */
export default async function EvrakDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <DocumentDetailView id={id} searchParams={searchParams} />;
}
