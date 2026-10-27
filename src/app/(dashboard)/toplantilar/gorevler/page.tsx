import { ActionItemListView } from "@/modules/meetings/ui";

export const metadata = { title: "Toplantı görevleri" };

/** Çapraz görev listesi (7.4) — ince rota. */
export default async function GorevlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ActionItemListView searchParams={searchParams} />;
}
