import type { Metadata } from "next";

import { ReportsView } from "../../server";
import { berlinToday } from "../../server";

export const metadata: Metadata = { title: "Raporlar" };

/** Raporlar — ?sekme=e|k|p|y + filter.year + account + from/to (§ 6). */
export default async function MuhasebeRaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{
    sekme?: string;
    "filter.year"?: string;
    account?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { sekme, "filter.year": yearRaw, account, from, to } = await searchParams;
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : berlinToday().getUTCFullYear();
  const tab = sekme === "k" ? "k" : sekme === "p" ? "p" : sekme === "y" ? "y" : "e";
  return (
    <ReportsView
      tab={tab}
      year={year}
      accountId={account ?? null}
      from={from ?? `${year}-01-01`}
      to={to ?? `${year}-12-31`}
    />
  );
}
