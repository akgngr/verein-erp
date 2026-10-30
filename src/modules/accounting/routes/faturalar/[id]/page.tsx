import { getTranslations } from "next-intl/server";

import type { RawSearchParams } from "@/shared/list-params";

import { InvoiceDetailView } from "../../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.invoices");
  return { title: t("title") };
}

/** Fatura / proforma detayı — ince sayfa. */
export default async function MuhasebeFaturaDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  return <InvoiceDetailView id={(await params).id} searchParams={searchParams} />;
}
