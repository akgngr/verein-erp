import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrganizationProfileView } from "@/modules/organization/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("dernekBilgileri") };
}

/** Dernek bilgileri (Faz 4, 4.2) — ince rota; iş view'dadır. */
export default function DernekBilgileriPage() {
  return <OrganizationProfileView />;
}
