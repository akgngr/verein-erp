import { getTranslations } from "next-intl/server";

import { DashboardView } from "@/modules/system/ui";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("panel") };
}

/** Panel: kartlar modüllerin `cards/` klasörlerinden gelir (bkz. system modülü DashboardView). */
export default function PanelPage() {
  return <DashboardView />;
}
