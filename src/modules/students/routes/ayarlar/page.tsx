import { getTranslations } from "next-intl/server";

import { StudentsSettingsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("students.meta");
  return { title: t("settings") };
}

export default function StudentsSettingsPage() {
  return <StudentsSettingsView />;
}
