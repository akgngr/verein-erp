import { getTranslations } from "next-intl/server";
import { MemberListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("members.meta");
  return { title: t("list") };
}

export default async function UyelerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MemberListView searchParams={searchParams} />;
}
