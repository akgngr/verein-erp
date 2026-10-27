import type { Metadata } from "next";

import { YearClosingView } from "@/modules/accounting/server";

export const metadata: Metadata = { title: "Yıl kapanışı" };

/** Yıl kapanışı — ince sayfa (§ 6). */
export default function MuhasebeYilKapanisiPage() {
  return <YearClosingView />;
}
