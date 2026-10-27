import type { Metadata } from "next";

import { AccountingDetailView } from "@/modules/accounting/server";

export const metadata: Metadata = { title: "Fiş detayı" };

/** Fiş detayı — ince sayfa (§ 6). */
export default async function MuhasebeDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountingDetailView id={id} />;
}
