import { getTranslations } from "next-intl/server";

import { berlinToday, ExtrasView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("extras") };
}

/** Demirbaş ve ekler — ?sekme=anlagen|pauschalen|fristen|ruecklagen|pruefung&yil= (ACC-8). */
export default async function MuhasebeEklerPage({ searchParams }: { searchParams: Promise<{ sekme?: string; yil?: string }> }) {
  const { sekme, yil } = await searchParams;
  const year = yil && /^\d{4}$/.test(yil) ? Number(yil) : berlinToday().getUTCFullYear();
  const tab = sekme === "pauschalen" || sekme === "fristen" || sekme === "ruecklagen" || sekme === "pruefung" ? sekme : "anlagen";
  return <ExtrasView tab={tab} year={year} />;
}
