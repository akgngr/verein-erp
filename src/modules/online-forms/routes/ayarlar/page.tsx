import { getTranslations } from "next-intl/server";

import { OnlineFormsSettingsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("online-forms.settings");
  return { title: t("title") };
}

export default function OnlineFormsSettingsPage() {
  return <OnlineFormsSettingsView />;
}
