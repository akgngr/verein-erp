import { getTranslations } from "next-intl/server";

import { MemberSyncView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("memberSync") };
}

/** Üyelik aktarımı — ince sayfa (§ 6). */
export default function MuhasebeUyelikAktarimiPage() {
  return <MemberSyncView />;
}
