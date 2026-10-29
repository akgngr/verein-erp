import { getTranslations } from "next-intl/server";
import { DonorListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("donors") };
}

/** Bağışçı listesi — ince rota: searchParams'ı view'a iletir. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DonorListView searchParams={searchParams} />;
}
