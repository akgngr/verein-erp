import { getTranslations } from "next-intl/server";

import { DemoView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("demo");
  return { title: t("title") };
}

/** Ayarlar → Demo veri (/ayarlar/demo-veri). */
export default function DemoPage() {
  return <DemoView />;
}
