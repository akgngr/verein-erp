import { getTranslations } from "next-intl/server";
import { ConfirmationListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("confirmations") };
}

/** Bildirim listesi — ince rota: searchParams'ı view'a iletir. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ConfirmationListView searchParams={searchParams} />;
}
