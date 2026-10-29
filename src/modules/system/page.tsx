import { getTranslations } from "next-intl/server";
import { SettingsOverviewView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("system.meta");
  return { title: t("settings") };
}

export default function SettingsPage() {
  return <SettingsOverviewView />;
}
