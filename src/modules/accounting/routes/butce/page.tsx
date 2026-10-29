import { getTranslations } from "next-intl/server";

import { BudgetView } from "../../server";
import { berlinToday } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("budget") };
}

/** Bütçe — ?filter.year= (§ 6). */
export default async function MuhasebeButcePage({
  searchParams,
}: {
  searchParams: Promise<{ "filter.year"?: string }>;
}) {
  const { "filter.year": yearRaw } = await searchParams;
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : berlinToday().getUTCFullYear();
  return <BudgetView year={year} />;
}
