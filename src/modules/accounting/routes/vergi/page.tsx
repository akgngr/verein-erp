import { getTranslations } from "next-intl/server";

import { berlinToday, TaxView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("tax") };
}

/** Vergi — ?sekme=ustva|euer|datev&yil=YYYY&donem=Q1|01|J (ACC-2). */
export default async function MuhasebeVergiPage({ searchParams }: { searchParams: Promise<{ sekme?: string; yil?: string; donem?: string }> }) {
  const { sekme, yil, donem } = await searchParams;
  const year = yil && /^\d{4}$/.test(yil) ? Number(yil) : berlinToday().getUTCFullYear();
  const tab = sekme === "euer" ? "euer" : sekme === "datev" ? "datev" : "ustva";
  return <TaxView tab={tab} year={year} period={donem ?? null} />;
}
