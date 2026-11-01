import { getTranslations } from "next-intl/server";

import { InboxView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("mail.inbox");
  return { title: t("title") };
}

/** E-posta → Gelen kutusu (?durum=NEW|DONE|ALL). */
export default async function MailInboxPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const { durum } = await searchParams;
  return <InboxView status={durum ?? null} />;
}
