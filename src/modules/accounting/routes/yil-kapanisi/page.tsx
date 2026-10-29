import { getTranslations } from "next-intl/server";

import { YearClosingView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("yearClosing") };
}

/** Yıl kapanışı — ince sayfa (§ 6). */
export default function MuhasebeYilKapanisiPage() {
  return <YearClosingView />;
}
