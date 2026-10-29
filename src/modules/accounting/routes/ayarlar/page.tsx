import { getTranslations } from "next-intl/server";

import { AccountingSetupView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("settings") };
}

/** Ayarlar — ?sekme=hesaplar|kategoriler|projeler (§ 6). */
export default async function MuhasebeAyarlarPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string }>;
}) {
  const { sekme } = await searchParams;
  const tab = sekme === "kategoriler" ? "kategoriler" : sekme === "projeler" ? "projeler" : "hesaplar";
  return <AccountingSetupView tab={tab} />;
}
