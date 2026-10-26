import { DocumentCreateView } from "@/modules/documents/ui";

export const metadata = { title: "Yeni Evrak" };

/** Yeni evrak — ince rota: yon parametresini view'a iletir. */
export default async function YeniEvrakPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DocumentCreateView searchParams={searchParams} />;
}
