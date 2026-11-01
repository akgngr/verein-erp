import { getTranslations } from "next-intl/server";

import { PayableDetailView } from "../../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("payables") };
}

/** Gelen fatura detayı (ACC-5). */
export default async function MuhasebeGelenFaturaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ duzenle?: string }> }) {
  return <PayableDetailView id={(await params).id} editing={(await searchParams).duzenle === "1"} />;
}
