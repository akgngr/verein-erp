import { getTranslations } from "next-intl/server";

import { CalendarSettingsView } from "../../views/calendar-settings-view";

export async function generateMetadata() {
  const t = await getTranslations("calendar.sync");
  return { title: t("settingsTitle") };
}

export default function CalendarSettingsPage() {
  return <CalendarSettingsView />;
}
