import { getTranslations } from "next-intl/server";

import { GrantsListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("grants");
  return { title: t("title") };
}

/** /hibeler — ince rota. */
export default function GrantsPage() {
  return <GrantsListView />;
}
