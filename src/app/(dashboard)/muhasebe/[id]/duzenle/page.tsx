import type { Metadata } from "next";

import { AccountingEditView } from "@/modules/accounting/server";

export const metadata: Metadata = { title: "Fişi düzenle" };

/** Fiş düzenleme — ince sayfa (§ 6). */
export default async function MuhasebeDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountingEditView id={id} />;
}
