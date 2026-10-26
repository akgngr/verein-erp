import { DocumentEditView } from "@/modules/documents/ui";

export const metadata = { title: "Evrağı Düzenle" };

/** Evrak düzenleme — ince rota: id'yi view'a iletir. */
export default async function EvrakDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditView id={id} />;
}
