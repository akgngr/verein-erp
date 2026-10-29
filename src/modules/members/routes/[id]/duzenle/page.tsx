import { getTranslations } from "next-intl/server";
import { MemberEditView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("meta");
  return { title: t("uyeDuzenle") };
}

/** Üye düzenleme — ince rota: id'yi view'a iletir. */
export default async function UyeDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberEditView id={id} />;
}
