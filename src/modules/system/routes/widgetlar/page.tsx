import { getTranslations } from "next-intl/server";
import { WidgetSettingsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.ui.widgetSettings");
  return { title: t("title") };
}

export default function WidgetSettingsPage() {
  return <WidgetSettingsView />;
}
