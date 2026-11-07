import { getTranslations } from "next-intl/server";

import { SepaView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("sepa");
  return { title: t("title") };
}

/** /sepa — ince rota. */
export default function SepaPage() {
  return <SepaView />;
}
