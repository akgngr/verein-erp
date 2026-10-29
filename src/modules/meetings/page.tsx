import { getTranslations } from "next-intl/server";
import { MeetingListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("meetings.meta");
  return { title: t("list") };
}

/** Toplantı listesi (7.1) — ince rota: içerik views/meeting-list-view.tsx'te. */
export default async function ToplantilarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MeetingListView searchParams={searchParams} />;
}
