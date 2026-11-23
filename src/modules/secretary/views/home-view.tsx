import { NotebookPen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { SecretaryTodayCard } from "../components/today-card";
import { SecretaryFollowUps } from "../components/follow-ups";
import { SecretaryWeeklyReport } from "../components/weekly-report";
import { SecretaryInboxView } from "./inbox-view";
import { SecretaryPreferencesView } from "./preferences-view";
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
          actions: {
            dismiss: t("ui.dismiss"),
            tomorrow: t("ui.tomorrow"),
            nextWeek: t("ui.nextWeek"),
            undo: t("ui.undo"),
            done: t("ui.actionDone"),
            error: t("ui.actionError"),
          },
        }} />
      ) : (
        <EmptyState icon={NotebookPen} title={t("ui.unavailable")} description={t("ui.tryAgain")} />
      )}
      <SecretaryFollowUps labels={{
        heading: t("ui.followUpsTitle"), title: t("ui.followUpsName"), due: t("ui.followUpsDue"),
        create: t("ui.followUpsCreate"), empty: t("ui.followUpsEmpty"),
        unavailable: t("ui.followUpsUnavailable"), loading: t("ui.followUpsLoading"),
        saved: t("ui.followUpsSaved"), changed: t("ui.followUpsChanged"),
        error: t("ui.followUpsError"), openSource: t("ui.openSource"), retry: t("ui.tryAgain"),
        reminders: t("ui.followUpsReminders"),
        cancelPrompt: t("ui.followUpsConfirmCancel"), keep: t("ui.followUpsKeep"),
        status: {
          ACTIVE: t("ui.followUpsActive"), PAUSED: t("ui.followUpsPaused"),
          EXHAUSTED: t("ui.followUpsExhausted"), DONE: t("ui.followUpsDone"),
          CANCELLED: t("ui.followUpsCancelled"),
        },
        actions: {
          pause: t("ui.followUpsPause"), resume: t("ui.followUpsResume"),
          cancel: t("ui.followUpsCancel"), complete: t("ui.followUpsComplete"),
        },
      }} />
      <SecretaryWeeklyReport labels={{
        title: t("ui.weeklyReportTitle"), description: t("ui.weeklyReportDescription"),
        request: t("ui.weeklyReportRequest"), check: t("ui.weeklyReportCheck"),
        files: t("ui.weeklyReportFiles"), pending: t("ui.weeklyReportPending"),
        ready: t("ui.weeklyReportReady"), failed: t("ui.weeklyReportFailed"),
        error: t("ui.weeklyReportError"),
      }} />
      <SecretaryInboxView user={{ id: user.id, role: user.role }} />
      <SecretaryPreferencesView user={{ id: user.id }} />
    </section>
  );
}
