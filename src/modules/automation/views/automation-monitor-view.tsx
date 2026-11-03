import { Chip } from "@heroui/react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { automationPermissions } from "../permissions";
import { listAutomationExecutions } from "../queries/list-executions";

export async function AutomationMonitorView() {
  try {
    await requirePermission(automationPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [t, format, executions] = await Promise.all([
    getTranslations("automation.monitor"),
    getFormatter(),
    listAutomationExecutions(),
  ]);
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

      <section className="flex flex-col gap-3">
        <h2 className="text-medium font-semibold">{t("recent")}</h2>
        {executions.length === 0 ? (
          <p className="rounded-large border border-default-200 p-5 text-small text-default-500">{t("empty")}</p>
        ) : executions.map((execution) => (
          <article key={execution.id} className="rounded-large border border-default-200 bg-content1 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{execution.definitionKey}</p>
                <p className="mt-1 break-all text-tiny text-default-500">{execution.id}</p>
                <p className="mt-1 text-small text-default-500">
                  {format.dateTime(execution.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {execution.sourceModule}
                </p>
              </div>
              <Chip size="sm" variant="flat" color={statusColor(execution.status)}>
                {t(`status.${execution.status}` as never)}
              </Chip>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small text-default-600">
              <span>{t("attempt", { current: execution.attempt, max: execution.maxAttempts })}</span>
              {execution.startedAt ? <span>{t("started", { date: format.dateTime(execution.startedAt, { dateStyle: "short", timeStyle: "short" }) })}</span> : null}
              {execution.finishedAt ? <span>{t("finished", { date: format.dateTime(execution.finishedAt, { dateStyle: "short", timeStyle: "short" }) })}</span> : null}
              {execution.lastErrorCode ? <span className="font-medium text-danger">{execution.lastErrorCode}</span> : null}
            </div>

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
        ))}
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

function statusColor(status: string): "success" | "danger" | "warning" | "default" {
  if (status === "SUCCEEDED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING") return "warning";
  return "default";
}
