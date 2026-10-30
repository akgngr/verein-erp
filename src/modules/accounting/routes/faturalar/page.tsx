import { getTranslations } from "next-intl/server";

import type { RawSearchParams } from "@/shared/list-params";

import { InvoicesView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.invoices");
  return { title: t("title") };
}

/** Faturalar ve proformalar — ince sayfa. */
export default function MuhasebeFaturalarPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <InvoicesView searchParams={searchParams} />;
}
