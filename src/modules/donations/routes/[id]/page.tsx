import { getTranslations } from "next-intl/server";
import { DonationDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("detail") };
}

/** Bağış detayı — ince rota: id'yi view'a iletir. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <DonationDetailView id={id} searchParams={searchParams} />;
}
