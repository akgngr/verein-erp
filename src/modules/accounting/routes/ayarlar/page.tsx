import type { Metadata } from "next";

import { AccountingSetupView } from "../../server";

export const metadata: Metadata = { title: "Muhasebe ayarları" };

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
