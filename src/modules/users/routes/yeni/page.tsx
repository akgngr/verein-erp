import { getTranslations } from "next-intl/server";
import { UserCreateView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("users.meta");
  return { title: t("create") };
}

export default function YeniKullaniciPage() {
  return <UserCreateView />;
}
