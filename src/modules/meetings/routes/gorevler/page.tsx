import { getTranslations } from "next-intl/server";
import { ActionItemListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("meetings.meta");
  return { title: t("tasks") };
}

/** Çapraz görev listesi (7.4) — ince rota. */
export default async function GorevlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ActionItemListView searchParams={searchParams} />;
}
