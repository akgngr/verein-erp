import { redirect } from "next/navigation";

/** Eski adres: yeni üye formu artık listenin sağ çekmecesinde açılır. */
export default function YeniUyePage() {
  redirect("/uyeler?yeni");
}
