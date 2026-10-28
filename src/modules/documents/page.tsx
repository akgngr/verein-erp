import { DocumentListView } from "./ui";

export const metadata = { title: "Evrak Kayıt" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DocumentListView searchParams={searchParams} />;
}
