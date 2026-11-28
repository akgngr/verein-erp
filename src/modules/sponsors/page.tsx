import { getTranslations } from "next-intl/server";

import { SponsorsListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("sponsors.meta");
  return { title: t("list") };
}

/** Modül ana sayfası (/sponsors) — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SponsorsListView searchParams={searchParams} />;
}
