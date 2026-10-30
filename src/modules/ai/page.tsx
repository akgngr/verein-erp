import { getTranslations } from "next-intl/server";

import { AiSettingsView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("ai.meta");
  return { title: t("settings") };
}

/** Yapay zekâ asistanı: durum, veri koruma ve rıza yönetimi — ince rota. */
export default function AiPage() {
  return <AiSettingsView />;
}
