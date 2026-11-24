import { getTranslations } from "next-intl/server";

import { VoteBooth } from "../../components/vote-booth";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("meetings.vote.booth");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** OTURUMSUZ: /oy — gizli oylama kabini (RFC-004). Oturum okunmaz; tek girdi tek kullanımlık oy kodudur. */
export default function VoteBoothPage() {
  return <VoteBooth />;
}
