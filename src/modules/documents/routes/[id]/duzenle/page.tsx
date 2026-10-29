import { getTranslations } from "next-intl/server";
import { DocumentEditView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("documents.meta");
  return { title: t("edit") };
}

/** Evrak düzenleme — ince rota: id'yi view'a iletir. */
export default async function EvrakDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditView id={id} />;
}
