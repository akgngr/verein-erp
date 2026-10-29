import { getTranslations } from "next-intl/server";

import { AccountingDetailView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("detail") };
}

/** Fiş detayı — ince sayfa (§ 6). */
export default async function MuhasebeDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <AccountingDetailView id={id} searchParams={searchParams} />;
}
