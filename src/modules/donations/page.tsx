import { getTranslations } from "next-intl/server";
import { DonationListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("list") };
}

export default async function BagislarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DonationListView searchParams={searchParams} />;
}
