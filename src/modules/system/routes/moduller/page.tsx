import { getTranslations } from "next-intl/server";
import { ModuleManagementView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.meta");
  return { title: t("modules") };
}

export default async function ModulesPage() {
  return <ModuleManagementView />;
}
