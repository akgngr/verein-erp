import { getTranslations } from "next-intl/server";

import { BankingView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("banking");
  return { title: t("title") };
}

/** Ayarlar → Banka bağlantısı (?sonuc=baglandi|bekliyor|hata: onaydan dönüş). */
export default async function BankingPage({ searchParams }: { searchParams: Promise<{ sonuc?: string }> }) {
  const { sonuc } = await searchParams;
  return <BankingView result={sonuc ?? null} />;
}
