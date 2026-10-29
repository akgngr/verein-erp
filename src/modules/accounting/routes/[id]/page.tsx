import { getTranslations } from "next-intl/server";

import { AccountingDetailView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("detail") };
}

/** Fiş detayı — ince sayfa (§ 6). */
export default async function MuhasebeDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountingDetailView id={id} />;
}
