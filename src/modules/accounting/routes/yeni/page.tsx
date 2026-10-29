import type { Metadata } from "next";

import { AccountingCreateView } from "../../server";

export const metadata: Metadata = { title: "Yeni fiş" };

/** Yeni fiş — ?tur=gelir|gider|virman (§ 6). */
export default async function MuhasebeYeniPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const { tur } = await searchParams;
  const type = tur === "gider" ? "EXPENSE" : tur === "virman" ? "TRANSFER" : "INCOME";
  return <AccountingCreateView type={type} />;
}
