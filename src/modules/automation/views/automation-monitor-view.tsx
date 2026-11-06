import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { automationPermissions } from "../permissions";
import { ExecutionActions } from "../components/execution-actions";
import { ExecutionStatusChip } from "../components/execution-status-chip";
import { SchedulesPanel } from "../components/schedules-panel";
import { ApprovalsPanel } from "../components/approvals-panel";
import { listPendingApprovals } from "../services/workflows";
import { listSchedulableTasks, listSchedules } from "../services/schedules";
import { listAutomationExecutions } from "../queries/list-executions";

export async function AutomationMonitorView() {
  let user;
  try {
    user = await requirePermission(automationPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [t, terr, format, executions, schedules, approvals, canUpdate, canApprove] = await Promise.all([
    getTranslations("automation.monitor"),
    getTranslations("automation.errorCodes"),
    getFormatter(),
    listAutomationExecutions(),
    listSchedules(),
    listPendingApprovals(),
    Promise.resolve(can(user.role, automationPermissions, "update")),
    Promise.resolve(can(user.role, automationPermissions, "approve")),
  ]);
  const fmt = (date: Date) => format.dateTime(date, { dateStyle: "short", timeStyle: "short" });
  const failed = executions.filter((item) => item.status === "FAILED").length;
  const running = executions.filter((item) => item.status === "RUNNING").length;
  const completed = executions.filter((item) => item.status === "SUCCEEDED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label={t("metrics.running")} value={running} />
        <Metric label={t("metrics.failed")} value={failed} />
        <Metric label={t("metrics.completed")} value={completed} />
      </div>

      <ApprovalsPanel
        canDecide={canApprove}
        approvals={approvals.map((step) => {
          const ctx = (step.execution.context ?? {}) as Record<string, unknown>;
          const input = (step.input ?? {}) as Record<string, unknown>;
          return {
            stepId: step.id,
            workflowName: typeof ctx.workflowName === "string" ? ctx.workflowName : step.execution.id,
            label: step.stepKey,
            note: typeof input.note === "string" ? input.note : "",
            createdAt: fmt(step.createdAt),
          };
        })}
      />

      <SchedulesPanel
        canManage={canApprove}
        tasks={listSchedulableTasks()}
        schedules={schedules.map((schedule) => ({
          id: schedule.id,
          taskKey: schedule.taskKey,
          intervalMinutes: schedule.intervalMinutes,
          enabled: schedule.enabled,
          nextRun: fmt(schedule.nextRunAt),
          lastRun: schedule.lastRunAt ? fmt(schedule.lastRunAt) : null,
        }))}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-medium font-semibold">{t("recent")}</h2>
        {executions.length === 0 ? (
          <p className="rounded-large border border-default-200 p-5 text-small text-default-500">{t("empty")}</p>
        ) : executions.map((execution) => {
          const taskResultError = resultErrorCode(execution.steps[0]?.result);
          return (
          <article key={execution.id} className="rounded-large border border-default-200 bg-content1 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {execution.kind === "WORKFLOW" && typeof (execution.context as Record<string, unknown> | null)?.workflowName === "string"
                    ? String((execution.context as Record<string, unknown>).workflowName)
                    : execution.definitionKey}
                </p>
                <p className="mt-1 break-all text-tiny text-default-500">{execution.id}</p>
                <p className="mt-1 text-small text-default-500">
                  {format.dateTime(execution.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {execution.sourceModule}
                </p>
              </div>
              <ExecutionStatusChip
                status={execution.status}
                label={t(`status.${execution.status}` as never)}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small text-default-600">
              <span>{t("attempt", { current: execution.attempt, max: execution.maxAttempts })}</span>
              {execution.startedAt ? <span>{t("started", { date: format.dateTime(execution.startedAt, { dateStyle: "short", timeStyle: "short" }) })}</span> : null}
              {execution.finishedAt ? <span>{t("finished", { date: format.dateTime(execution.finishedAt, { dateStyle: "short", timeStyle: "short" }) })}</span> : null}
              {execution.lastErrorCode ? (
                <span className="font-medium text-danger">
                  {terr.has(execution.lastErrorCode as never) ? terr(execution.lastErrorCode as never) : execution.lastErrorCode}
                </span>
              ) : null}
            </div>
            {taskResultError ? (
              <p className="mt-2 text-small font-medium text-danger">
                {t("taskResultError", { code: taskResultError })}
              </p>
            ) : null}

            {execution.campaign ? (
              <div className="mt-3 rounded-medium bg-default-50 p-3 text-small">
                <p className="font-medium">{t("mailing")}: {execution.campaign.subject}</p>
                <p className="mt-1 text-default-600">
                  {t("mailResult", { sent: execution.campaign.sentCount, failed: execution.campaign.failedCount, total: execution.campaign.recipientCount })}
                </p>
              </div>
            ) : null}

            {execution.mailErrors.length > 0 ? (
              <div className="mt-3 rounded-medium border border-danger-200 bg-danger-50 p-3">
                <p className="mb-2 text-small font-semibold text-danger">{t("mailErrors", { count: execution.mailErrors.length })}</p>
                <ul className="space-y-2">
                  {execution.mailErrors.map((log) => (
                    <li key={log.id} className="text-small text-danger-700">
                      <span className="font-medium">{log.subject}</span>
                      <p className="mt-0.5 break-words">{log.error || t("unknownError")}</p>
                      <p className="text-tiny text-danger-600">{format.dateTime(log.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {canUpdate ? <ExecutionActions id={execution.id} status={execution.status} /> : null}

            {execution.logs.length > 0 ? (
              <div className="mt-3 border-t border-default-100 pt-3">
                <p className="mb-2 text-small font-semibold">{t("eventLog")}</p>
                <ul className="space-y-2">
                  {execution.logs.map((log) => (
                    <li key={log.id} className="flex gap-2 text-small">
                      <span className={log.level === "ERROR" ? "shrink-0 font-semibold text-danger" : "shrink-0 text-default-500"}>
                        {format.dateTime(log.createdAt, { dateStyle: "short", timeStyle: "medium" })}
                      </span>
                      <span className="min-w-0 break-words">{log.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
          );
        })}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-large border border-default-200 bg-content1 p-4">
      <p className="text-small text-default-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function resultErrorCode(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  return result.failed === true && typeof result.errorCode === "string" ? result.errorCode : null;
}

