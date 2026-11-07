import { getTranslations } from "next-intl/server";

import { GrantDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("grants");
  return { title: t("title") };
}

export default async function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GrantDetailView id={id.slice(0, 64)} />;
}
