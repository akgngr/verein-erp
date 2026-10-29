import { redirect } from "next/navigation";

/** Eski adres: form artık sağ çekmecede açılır. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/evrak/${id}?duzenle`);
}
