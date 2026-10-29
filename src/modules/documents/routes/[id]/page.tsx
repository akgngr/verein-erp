import { getTranslations } from "next-intl/server";
import { DocumentDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("documents.meta");
  return { title: t("detail") };
}

/** Evrak detayı — ince rota: id'yi view'a iletir. */
export default async function EvrakDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentDetailView id={id} />;
}
