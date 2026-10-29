import { getTranslations } from "next-intl/server";
import { MemberDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("meta");
  return { title: t("uyeDetay") };
}

/** Üye detayı — ince rota: id'yi view'a iletir. */
export default async function UyeDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <MemberDetailView id={id} searchParams={searchParams} />;
}
