import { getTranslations } from "next-intl/server";

import { WorkflowsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("automation.workflows");
  return { title: t("title") };
}

export default function WorkflowsPage() {
  return <WorkflowsView />;
}
