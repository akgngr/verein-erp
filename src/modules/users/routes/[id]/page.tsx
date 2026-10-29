import { getTranslations } from "next-intl/server";
import { UserEditView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("users.meta");
  return { title: t("edit") };
}

export default async function KullaniciDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserEditView userId={id} />;
}
