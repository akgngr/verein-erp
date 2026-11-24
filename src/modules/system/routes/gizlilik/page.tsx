import { getTranslations } from "next-intl/server";
import { PrivacyPresetsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.privacyUi");
  return { title: t("title") };
}

export default function PrivacySettingsPage() {
  return <PrivacyPresetsView />;
}
