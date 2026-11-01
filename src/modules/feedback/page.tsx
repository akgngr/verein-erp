import { getTranslations } from "next-intl/server";

import { FeedbackListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("feedback");
  return { title: t("titleAll") };
}

/** Geri bildirim listesi (/geri-bildirim) — ?durum=NEW|IN_PROGRESS|DONE|REJECTED&tur=BUG|SUGGESTION */
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ durum?: string; tur?: string }> }) {
  const { durum, tur } = await searchParams;
  const status = durum === "NEW" || durum === "IN_PROGRESS" || durum === "DONE" || durum === "REJECTED" ? durum : null;
  const type = tur === "BUG" || tur === "SUGGESTION" ? tur : null;
  return <FeedbackListView status={status} type={type} />;
}
