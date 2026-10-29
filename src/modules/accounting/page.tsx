import type { Metadata } from "next";

import { AccountingListView } from "./server";

export const metadata: Metadata = { title: "Muhasebe" };

/** Fiş listesi — ince sayfa (§ 6): veri view'da yüklenir. */
export default function MuhasebePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AccountingListView searchParams={searchParams} />;
}
