import { getTranslations } from "next-intl/server";

import { CoursesSettingsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("courses.meta");
  return { title: t("settings") };
}

export default function CoursesSettingsPage() {
  return <CoursesSettingsView />;
}
