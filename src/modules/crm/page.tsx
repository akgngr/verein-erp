import { getTranslations } from "next-intl/server";

import { CrmView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("crm.meta");
  return { title: t("list") };
}

/** Modül ana sayfası (/crm) — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function CrmPage() {
  return <CrmView />;
}
