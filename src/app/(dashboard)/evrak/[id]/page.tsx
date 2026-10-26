import { DocumentDetailView } from "@/modules/documents/ui";

export const metadata = { title: "Evrak Detayı" };

/** Evrak detayı — ince rota: id'yi view'a iletir. */
export default async function EvrakDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentDetailView id={id} />;
}
