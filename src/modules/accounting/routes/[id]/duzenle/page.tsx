import { getTranslations } from "next-intl/server";

import { AccountingEditView } from "../../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("edit") };
}

/** Fiş düzenleme — ince sayfa (§ 6). */
export default async function MuhasebeDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountingEditView id={id} />;
}
