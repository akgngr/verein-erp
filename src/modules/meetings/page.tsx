import { MeetingListView } from "./ui";

export const metadata = { title: "Toplantılar" };

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MeetingListView searchParams={searchParams} />;
}
