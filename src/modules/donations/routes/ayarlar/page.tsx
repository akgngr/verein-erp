import { getTranslations } from "next-intl/server";
import { DonationsSettingsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("settings") };
}

/** Bağış ayarları (şablon onayı + hazır olma kontrolü) — ince rota. */
export default function Page() {
  return <DonationsSettingsView />;
}
