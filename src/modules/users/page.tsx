import { getTranslations } from "next-intl/server";
import { UsersListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("users.meta");
  return { title: t("list") };
}

export default async function KullanicilarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <UsersListView searchParams={searchParams} />;
}
