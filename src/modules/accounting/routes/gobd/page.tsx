import { getTranslations } from "next-intl/server";

import { GobdView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("gobd") };
}

/** GoBD — ACC-7. */
export default function MuhasebeGobdPage() {
  return <GobdView />;
}
