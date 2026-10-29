import { redirect } from "next/navigation";

/** Eski adres: düzenleme formu artık detay sayfasının sağ çekmecesinde açılır. */
export default async function UyeDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/uyeler/${id}?duzenle`);
}
