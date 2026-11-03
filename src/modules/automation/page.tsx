import { getTranslations } from "next-intl/server";

import { AutomationMonitorView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("automation.monitor");
  return { title: t("title") };
}

export default function AutomationPage() {
  return <AutomationMonitorView />;
}
