import { getTranslations } from "next-intl/server";

import { PayoutsView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("courses.payouts");
  return { title: t("title") };
}

/** Öğretmen hakedişleri (?donem=YYYY-MM). */
export default async function CoursePayoutsPage({ searchParams }: { searchParams: Promise<{ donem?: string }> }) {
  const { donem } = await searchParams;
  return <PayoutsView period={donem ?? null} />;
}
