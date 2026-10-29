import { redirect } from "next/navigation";

/** Eski adres: yeni fiş formu artık listenin sağ çekmecesinde açılır (`?yeni=gelir|gider|virman`). */
export default async function Page({ searchParams }: { searchParams: Promise<{ tur?: string }> }) {
  const { tur } = await searchParams;
  redirect(`/muhasebe?yeni=${tur === "gider" || tur === "virman" ? tur : "gelir"}`);
}
