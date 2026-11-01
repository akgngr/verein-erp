import { getTranslations } from "next-intl/server";
import { ReleaseNotesView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.releases");
  return { title: t("title") };
}

/** Sürüm notları — ince sayfa (?modul=<anahtar> ile modülün sürüm notları). */
export default async function ReleaseNotesPage({ searchParams }: { searchParams: Promise<{ modul?: string }> }) {
  const { modul } = await searchParams;
  return <ReleaseNotesView moduleKey={modul ?? null} />;
}
