import { getTranslations } from "next-intl/server";

import { PackagesView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.packages");
  return { title: t("title") };
}

/** Modül paketleri (imzalı .vmod). */
export default function ModulePackagesPage() {
  return <PackagesView />;
}
