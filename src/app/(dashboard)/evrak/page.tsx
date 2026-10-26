import { DocumentListView } from "@/modules/documents/ui";

export const metadata = { title: "Evrak Kayıt" };

/** Evrak listesi — ince rota (3.4): yalnızca searchParams'ı view'a iletir. */
export default async function EvrakPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DocumentListView searchParams={searchParams} />;
}
