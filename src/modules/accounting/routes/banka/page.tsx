import { getTranslations } from "next-intl/server";

import { BankView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("bank") };
}

/** Banka ekstreleri — ?durum=open|booked|private|ignored (ACC-4). */
export default async function MuhasebeBankaPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const { durum } = await searchParams;
  const status = durum === "booked" ? "BOOKED" : durum === "private" ? "PRIVATE" : durum === "ignored" ? "IGNORED" : "OPEN";
  return <BankView status={status} />;
}
