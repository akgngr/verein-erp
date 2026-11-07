import { getTranslations } from "next-intl/server";

import { MailingsView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("mailings");
  return { title: t("title") };
}

/** Kampanyalar (?kaynak=<modül>:<kaynak>&filtre=<anahtar>=<değer> sihirbazı ön seçimle açar). */
export default async function MailingsPage({ searchParams }: { searchParams: Promise<{ kaynak?: string; filtre?: string | string[] }> }) {
  const { kaynak, filtre } = await searchParams;
  const initialFilter: Record<string, string[]> = {};
  for (const pair of (Array.isArray(filtre) ? filtre : filtre ? [filtre] : []).slice(0, 10)) {
    const index = pair.indexOf("=");
    if (index < 1) continue;
    const key = pair.slice(0, index).slice(0, 40);
    initialFilter[key] = [...(initialFilter[key] ?? []), pair.slice(index + 1).slice(0, 40)];
  }
  return <MailingsView sourceId={kaynak ?? null} initialFilter={initialFilter} />;
}
