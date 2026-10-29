import { getTranslations } from "next-intl/server";
import { EventListView, EventDetailView } from "./ui"

export async function generateMetadata() {
  const t = await getTranslations("events.meta");
  return { title: t("list") };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = await searchParams
  const detailId =
    typeof resolvedParams.detail === "string"
      ? resolvedParams.detail
      : typeof resolvedParams.id === "string"
        ? resolvedParams.id
        : null

  if (detailId) {
    return <EventDetailView eventId={detailId} />
  }

  return <EventListView searchParams={searchParams} />
}
