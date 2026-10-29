import type { Metadata } from "next";

import { BudgetView } from "../../server";
import { berlinToday } from "../../server";

export const metadata: Metadata = { title: "Bütçe" };

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
