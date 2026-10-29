import { getTranslations } from "next-intl/server";
import { DuesReportView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("members.meta");
  return { title: t("dues") };
}

export default async function AidatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DuesReportView searchParams={searchParams} />;
}
