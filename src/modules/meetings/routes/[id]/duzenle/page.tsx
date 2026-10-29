import { MeetingEditView } from "../../../ui";

export const metadata = { title: "Toplantıyı düzenle" };

/** Toplantı düzenleme (7.2) — ince rota. */
export default async function ToplantiDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingEditView id={id} />;
}
