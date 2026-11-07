import { getTranslations } from "next-intl/server";

import { OnlineFormsView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("online-forms");
  return { title: t("title") };
}

/** Modül ana sayfası (/online-formlar) — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function OnlineFormsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <OnlineFormsView searchParams={searchParams} />;
}
