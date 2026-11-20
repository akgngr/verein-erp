import { getTranslations } from "next-intl/server";

import { LicenseView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.license");
  return { title: t("title") };
}

/** Ayarlar → Lisans (RFC-002). */
export default function LicensePage() {
  return <LicenseView />;
}
