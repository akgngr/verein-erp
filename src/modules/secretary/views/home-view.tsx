import { NotebookPen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { SecretaryTodayCard } from "../components/today-card";
import { SecretaryFollowUps } from "../components/follow-ups";
import { SecretaryWeeklyReport } from "../components/weekly-report";
import { SecretaryDelegationPanel } from "../components/delegation-panel";
import { SecretaryChannelConsentsPanel } from "../components/channel-consents-panel";
import { SecretaryInboxView } from "./inbox-view";
import { SecretaryPreferencesView } from "./preferences-view";
import { secretaryPermissions } from "../permissions";
import { getBriefing } from "../services/briefing";
import { listDelegations } from "../services/delegation";
import { listConsents } from "../services/channels";

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
  const [delegations, consents] = await Promise.all([
    listDelegations(user.id).catch(() => null),
    listConsents(user.id).catch(() => null),
  ]);
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
      {delegations === null ? <p role="status">{t("ui.delegationPanel.unavailable")}</p> :
        <SecretaryDelegationPanel initialRows={delegations} labels={{
          title: t("ui.delegationPanel.title"), description: t("ui.delegationPanel.description"),
          userId: t("ui.delegationPanel.userId"), expiry: t("ui.delegationPanel.expiry"),
          briefing: t("ui.delegationPanel.briefing"), followUps: t("ui.delegationPanel.followUps"),
          grant: t("ui.delegationPanel.grant"), revoke: t("ui.delegationPanel.revoke"),
          confirm: t("ui.delegationPanel.confirm"), cancel: t("ui.delegationPanel.cancel"),
          view: t("ui.delegationPanel.view"), close: t("ui.delegationPanel.close"),
          given: t("ui.delegationPanel.given"), received: t("ui.delegationPanel.received"),
          empty: t("ui.delegationPanel.empty"), expired: t("ui.delegationPanel.expired"),
          success: t("ui.delegationPanel.success"), error: t("ui.delegationPanel.error"),
        }} />}
      {consents === null ? <p role="status">{t("ui.consentPanel.error")}</p> :
        <SecretaryChannelConsentsPanel initialRows={consents} labels={{
          title: t("ui.consentPanel.title"), unavailable: t("ui.consentPanel.unavailable"),
          empty: t("ui.consentPanel.empty"), revoke: t("ui.consentPanel.revoke"),
          confirm: t("ui.consentPanel.confirm"), cancel: t("ui.consentPanel.cancel"),
          saved: t("ui.consentPanel.saved"), error: t("ui.consentPanel.error"),
          status: { active: t("ui.consentPanel.active"), pending: t("ui.consentPanel.pending"), revoked: t("ui.consentPanel.revoked") },
        }} />}
      <SecretaryPreferencesView user={{ id: user.id }} />
    </section>
  );
}
