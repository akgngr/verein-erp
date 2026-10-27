import { getTranslations } from "next-intl/server";
import { MemberDetailView } from "@/modules/members/ui";

export async function generateMetadata() {
  const t = await getTranslations("meta");
  return { title: t("uyeDetay") };
}

/** Üye detayı — ince rota: id'yi view'a iletir. */
export default async function UyeDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberDetailView id={id} />;
}
