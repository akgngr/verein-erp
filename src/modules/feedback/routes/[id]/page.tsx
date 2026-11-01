import { getTranslations } from "next-intl/server";

import { FeedbackDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("feedback");
  return { title: t("titleAll") };
}

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <FeedbackDetailView id={(await params).id} />;
}
