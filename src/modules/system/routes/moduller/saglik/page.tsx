import { getTranslations } from "next-intl/server";
import { ReadinessCockpitView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.readiness");
  return { title: t("metaTitle") };
}

export default async function ReadinessPage() {
  return <ReadinessCockpitView />;
}
