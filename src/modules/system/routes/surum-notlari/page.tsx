import { getTranslations } from "next-intl/server";
import { ReleaseNotesView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.releases");
  return { title: t("title") };
}

/** Sürüm notları — ince sayfa. */
export default async function ReleaseNotesPage() {
  return <ReleaseNotesView />;
}
