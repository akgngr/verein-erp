import { MeetingListView } from "@/modules/meetings/ui";

export const metadata = { title: "Toplantılar" };

/** Toplantı listesi (7.1) — ince rota: içerik views/meeting-list-view.tsx'te. */
export default async function ToplantilarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MeetingListView searchParams={searchParams} />;
}
