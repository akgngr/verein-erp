import { getTranslations } from "next-intl/server";
import { ConfirmationIssueView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("issue") };
}

/** Bildirim oluşturma sihirbazı — ince rota: adım durumu searchParams'ta. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ConfirmationIssueView searchParams={searchParams} />;
}
