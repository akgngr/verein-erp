import { getTranslations } from "next-intl/server";

import { YouthProtectionListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("youth-protection.meta");
  return { title: t("list") };
}

/** Modül ana sayfası (/youth-protection) — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function YouthProtectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <YouthProtectionListView searchParams={searchParams} />;
}
