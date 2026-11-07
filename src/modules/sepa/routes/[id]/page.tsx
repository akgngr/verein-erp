import { getTranslations } from "next-intl/server";

import { SepaRunView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("sepa");
  return { title: t("title") };
}

export default async function SepaRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SepaRunView id={id.slice(0, 64)} />;
}
