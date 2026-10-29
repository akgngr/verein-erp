import { getTranslations } from "next-intl/server";

import { AccountingListView } from "./server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("list") };
}

/** Fiş listesi — ince sayfa (§ 6): veri view'da yüklenir. */
export default function MuhasebePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AccountingListView searchParams={searchParams} />;
}
