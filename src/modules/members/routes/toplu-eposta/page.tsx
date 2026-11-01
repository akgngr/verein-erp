import { getTranslations } from "next-intl/server";

import { MailingView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("members");
  return { title: t("mailing.title") };
}

/** Üyeler → Toplu e-posta. */
export default function MemberMailingPage() {
  return <MailingView />;
}
