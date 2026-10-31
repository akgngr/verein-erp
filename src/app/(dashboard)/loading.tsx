import { getTranslations } from "next-intl/server";

import { PageSkeleton } from "@/shared/components/ui/page-skeleton";

/** Sayfa geçişlerinde içerik alanı iskeleti (menü ve üst çubuk yerinde kalır). */
export default async function DashboardLoading() {
  const t = await getTranslations("common");
  return <PageSkeleton label={t("loading")} />;
}
