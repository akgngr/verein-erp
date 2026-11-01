import { getTranslations } from "next-intl/server";

import { SetupView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.setup");
  return { title: t("title") };
}

/** Kurulum sihirbazı — ince sayfa. */
export default function SetupPage() {
  return <SetupView />;
}
