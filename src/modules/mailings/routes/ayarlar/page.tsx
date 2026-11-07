import { getTranslations } from "next-intl/server";

import { MailingsSettingsView } from "../../views/mailings-settings-view";

export async function generateMetadata() {
  const t = await getTranslations("mailings.settings");
  return { title: t("title") };
}

export default function MailingsSettingsPage() {
  return <MailingsSettingsView />;
}
