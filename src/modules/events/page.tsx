import { EventListView } from "./views/event-list-view";
import { EventDetailView } from "./views/event-detail-view";

export const metadata = {
  title: "Etkinlikler — Verein ERP",
  description: "Dernek etkinlikleri, seminerler ve katılımcı yönetimi.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const detailId =
    typeof resolvedParams.detail === "string"
      ? resolvedParams.detail
      : typeof resolvedParams.id === "string"
      ? resolvedParams.id
      : null;

  if (detailId) {
    return <EventDetailView eventId={detailId} />;
  }

  return <EventListView searchParams={searchParams} />;
}
