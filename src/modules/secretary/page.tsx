import { getTranslations } from "next-intl/server";

import { SecretaryHomeView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("secretary.meta");
  return { title: t("home") };
}

/** Sekreter ana sayfası (/sekreter) — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function SecretaryPage() {
  return <SecretaryHomeView />;
}
