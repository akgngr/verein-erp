import { NotebookPen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { SecretaryTodayCard } from "../components/today-card";
import { secretaryPermissions } from "../permissions";
import { getBriefing } from "../services/briefing";

/** T1.4: authenticated, permission-filtered, server-rendered morning briefing. */
export async function SecretaryHomeView() {
  let user: Awaited<ReturnType<typeof requirePermission>>;
  try {
    user = await requirePermission(secretaryPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("secretary");
  let briefing: Awaited<ReturnType<typeof getBriefing>> | null = null;
  try {
    briefing = await getBriefing({ id: user.id, role: user.role });
  } catch {
    // Do not expose private provider or database errors in the UI.
    console.error("[secretary] BRIEFING_VIEW_FAILED");
  }
  return (
    <section className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {briefing ? (
        <SecretaryTodayCard briefing={briefing} limit={20} labels={{
          title: t("ui.today"),
          empty: t("ui.noItems"),
          failures: t("ui.partialFailure"),
          open: t("ui.openSource"),
          count: (count) => t("ui.count", { count }),
        }} />
      ) : (
        <EmptyState icon={NotebookPen} title={t("ui.unavailable")} description={t("ui.tryAgain")} />
      )}
    </section>
  );
}
