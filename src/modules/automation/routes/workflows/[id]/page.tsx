import { getTranslations } from "next-intl/server";

import { WorkflowDetailView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("automation.workflows");
  return { title: t("title") };
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowDetailView id={id} />;
}
