import { getTranslations } from "next-intl/server";

import { MailingsView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("mailings");
  return { title: t("title") };
}

/** Toplu e-posta (?kaynak=<modül>:<kaynak>). */
export default async function MailingsPage({ searchParams }: { searchParams: Promise<{ kaynak?: string }> }) {
  const { kaynak } = await searchParams;
  return <MailingsView sourceId={kaynak ?? null} />;
}
