import { getTranslations } from "next-intl/server";
import { ProfileView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("auth.meta");
  return { title: t("profile") };
}

export default function ProfilPage() {
  return <ProfileView />;
}
