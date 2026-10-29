import { getTranslations } from "next-intl/server";

import { AccountingCreateView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("create") };
}

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
