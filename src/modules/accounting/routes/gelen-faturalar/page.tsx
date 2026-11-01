import { getTranslations } from "next-intl/server";

import { PayablesView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("payables") };
}

/** Gelen faturalar — ?durum=draft|open|paid|cancelled (ACC-5). */
export default async function MuhasebeGelenFaturalarPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const { durum } = await searchParams;
  const status = durum === "draft" ? "DRAFT" : durum === "open" ? "OPEN" : durum === "paid" ? "PAID" : durum === "cancelled" ? "CANCELLED" : null;
  return <PayablesView status={status} />;
}
