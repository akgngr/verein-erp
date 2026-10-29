import { redirect } from "next/navigation";

/** Eski adres: form artık listenin sağ çekmecesinde açılır. */
export default function Page() {
  redirect("/toplantilar?yeni");
}
