import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { can } from "@/shared/permissions/define";
import { compileWorkflow, CONDITION_OPERATORS, stableStringify, type CanonicalGraph } from "@/shared/automation/workflow-graph";

import { ExecutionStatusChip } from "../components/execution-status-chip";
import { WorkflowHeaderActions } from "../components/workflow-header-actions";
import { WorkflowTabs } from "../components/workflow-tabs";
import type { NodeLabels } from "../editor/node-types";
import { getDb } from "@/shared/db";
import { automationPermissions } from "../permissions";
import { buildEditorCatalog } from "../services/workflow-catalog";
import { describeGraph } from "../services/workflow-describe";
import { getWorkflow, listWorkflowRuns, listWorkflowVersions, workflowStats } from "../services/workflows";

const NODE_LABEL_KEYS = [
  "groupStart", "groupActions", "groupLogic",
  "trigger", "triggerDesc", "triggerType", "manual", "event", "eventKey",
  "condition", "conditionDesc", "field", "customField", "customFieldHelp", "customFieldOption", "operator", "value", "valueHelp",
  "parallel", "parallelDesc",
  "delay", "delayDesc", "delayMode", "delayDuration", "delayUntil", "amount", "unit", "minutesUnit", "hoursUnit", "daysUnit", "until",
  "approval", "approvalDesc", "note", "variablesHint", "customValueOption", "possibleValues", "manualValue", "booleanHelp", "numberHelp", "textHelp", "manualTriggerFieldHelp", "yes", "no", "selectValue", "name",
] as const;

export async function WorkflowDetailView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(automationPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const workflow = await getWorkflow(id);
  if (!workflow) notFound();

  const [t, tn, tops, tm, terr, format, runs, versions, stats, catalog] = await Promise.all([
    getTranslations("automation.workflows"),
    getTranslations("automation.workflows.nodes"),
    getTranslations("automation.workflows.nodes.operators"),
    getTranslations("automation.monitor"),
    getTranslations("automation.errorCodes"),
    getFormatter(),
    listWorkflowRuns(id),
    listWorkflowVersions(id),
    workflowStats(id),
    buildEditorCatalog(),
  ]);
  const childIds = runs.flatMap((run) => run.steps.map((step) => step.childExecutionId).filter((value): value is string => Boolean(value)));
  const children = childIds.length
    ? await getDb().automationExecution.findMany({ where: { id: { in: childIds } }, select: { id: true, status: true, attempt: true, maxAttempts: true, lastErrorCode: true } })
    : [];
  const explain = (code: string | null | undefined) => !code ? "" : terr.has(code as never) ? terr(code as never) : code;
  const labels = {
    ...Object.fromEntries(NODE_LABEL_KEYS.map((key) => [key, tn(key)])),
    operators: Object.fromEntries(CONDITION_OPERATORS.map((op) => [op, tops(op)])),
  } as NodeLabels;

  const activeVersion = versions.find((version) => version.id === workflow.activeVersionId) ?? null;
  const activeGraph = (activeVersion?.graph ?? null) as CanonicalGraph | null;
  const draftGraph = compileWorkflow(workflow.draft).graph ?? null;
  const draftDiffers = Boolean(draftGraph) && stableStringify(draftGraph) !== stableStringify(activeGraph);
  const trigger = activeGraph?.nodes.find((node) => node.kind === "trigger");
  const manualTrigger = trigger?.kind === "trigger" && trigger.config.triggerType === "manual";
  const describedActive = activeGraph ? await describeGraph(activeGraph, catalog) : null;
  const graphTitles = new Map((describedActive?.nodes ?? []).map((node) => [node.id, node.title]));
  const date = (value: Date) => format.dateTime(value, { dateStyle: "medium", timeStyle: "short" });
  const status = !activeVersion ? "draft" : workflow.enabled ? "active" : "inactive";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/automation/workflows" aria-label={t("back")} className="rounded-medium border border-default-200 p-2 hover:bg-default-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold">{workflow.name}</h1>
            <StatusBadge status={status} label={t(`statusLabel.${status}`)} />
          </div>
          <p className="text-small text-default-500">{t("lastUpdated", { date: date(workflow.updatedAt) })}</p>
          {workflow.description ? <p className="mt-1 max-w-3xl text-small text-default-700">{workflow.description}</p> : null}
        </div>
        <div className="ms-auto">
          <WorkflowHeaderActions
            id={workflow.id}
            name={workflow.name}
            draft={(workflow.draft ?? {}) as { nodes?: unknown[]; edges?: unknown[] }}
            catalog={catalog}
            labels={labels}
            enabled={workflow.enabled}
            published={Boolean(activeVersion)}
            hasUnpublishedChanges={draftDiffers}
            manualTrigger={manualTrigger}
            canEdit={can(user.role, automationPermissions, "update")}
            canPublish={can(user.role, automationPermissions, "approve")}
            canRun={can(user.role, automationPermissions, "update")}
            canDelete={can(user.role, automationPermissions, "delete")}
          />
        </div>
      </header>

      {draftDiffers && activeVersion ? (
        <p className="rounded-large border border-warning-200 bg-warning-50 px-4 py-3 text-small text-warning-800">{t("unpublishedChanges")}</p>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={t("stats.runs")} value={String(stats.total)} />
        <Stat label={t("stats.succeeded")} value={String(stats.succeeded)} />
        <Stat label={t("stats.failed")} value={String(stats.failed)} tone={stats.failed ? "danger" : undefined} />
        <Stat label={t("stats.successRate")} value={stats.successRate === null ? "–" : `%${stats.successRate}`} />
        <Stat label={t("stats.avgDuration")} value={stats.avgMs === null ? "–" : duration(stats.avgMs, t)} />
      </section>
      <p className="-mt-4 text-tiny text-default-500">{t("stats.window")}</p>

      <WorkflowTabs
        active={describedActive}
        draft={draftGraph ? await describeGraph(draftGraph, catalog) : null}
        draftDiffers={draftDiffers}
        versions={await Promise.all(versions.map(async (version) => ({
          version: version.version,
          date: date(version.createdAt),
          isActive: version.id === workflow.activeVersionId,
          graph: await describeGraph(version.graph as unknown as CanonicalGraph, catalog),
        })))}
      />

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-medium font-semibold">{t("recentRuns")}</h2>
          <p className="text-small text-default-500">{t("retentionHint")}</p>
        </div>
        {runs.length === 0 ? (
          <p className="rounded-large border border-default-200 p-5 text-small text-default-500">{t("noRuns")}</p>
        ) : (
          <div className="overflow-x-auto rounded-large border border-default-200">
            <table className="w-full text-small">
              <thead className="bg-default-100 text-start text-default-600">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">{t("runs_.start")}</th>
                  <th className="px-4 py-2 text-start font-medium">{t("runs_.status")}</th>
                  <th className="px-4 py-2 text-start font-medium">{t("runs_.result")}</th>
                  <th className="px-4 py-2 text-start font-medium">{t("runs_.duration")}</th>
                  <th className="px-4 py-2 text-start font-medium">{t("runs_.version")}</th>
                  <th className="px-4 py-2 text-start font-medium">{t("runs_.trigger")}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const done = run.steps.filter((step) => step.status === "SUCCEEDED").length;
                  const skipped = run.steps.filter((step) => step.status === "SKIPPED").length;
                  const failedStep = run.steps.find((step) => step.status === "FAILED");
                  const waitingStep = run.steps.find((step) => step.status === "WAITING");
                  const runningStep = run.steps.find((step) => step.status === "RUNNING");
                  const runningChild = children.find((child) => child.id === runningStep?.childExecutionId);
                  const stepName = (key: string) => graphTitles.get(key) ?? key;
                  const unmet = run.steps.find((step) => step.taskKey === "workflow.condition" && (step.result as { passed?: boolean } | null)?.passed === false);
                  const unmetOut = ((unmet?.result as { output?: Record<string, unknown> } | null)?.output ?? {}) as Record<string, unknown>;
                  const result = failedStep
                    ? t("runs_.failedAt", { step: stepName(failedStep.stepKey), code: explain(failedStep.lastErrorCode) })
                    : runningStep && runningChild?.lastErrorCode
                      ? t("runs_.retrying", { step: stepName(runningStep.stepKey), code: explain(runningChild.lastErrorCode), attempt: runningChild.attempt, max: runningChild.maxAttempts })
                    : runningStep
                      ? t("runs_.running", { step: stepName(runningStep.stepKey) })
                    : unmet
                      ? t("runs_.conditionNotMet", { step: stepName(unmet.stepKey), field: String(unmetOut.field ?? ""), expected: String(unmetOut.expected ?? ""), actual: String(unmetOut.actual ?? "") })
                    : waitingStep
                      ? t(waitingStep.taskKey === "workflow.approval" ? "runs_.waitingApproval" : "runs_.waitingDelay")
                      : t("runs_.stepsDone", { done, skipped });
                  return (
                    <tr key={run.id} className="border-t border-default-100">
                      <td className="px-4 py-2">{date(run.createdAt)}</td>
                      <td className="px-4 py-2"><ExecutionStatusChip status={run.status} label={tm(`status.${run.status}` as never)} /></td>
                      <td className={failedStep ? "px-4 py-2 text-danger" : "px-4 py-2 text-default-600"}>{result}</td>
                      <td className="px-4 py-2 text-default-600">{run.finishedAt ? duration(run.finishedAt.getTime() - run.createdAt.getTime(), t) : "–"}</td>
                      <td className="px-4 py-2 text-default-600">v{run.definitionVersion}</td>
                      <td className="px-4 py-2 text-default-600">{run.idempotencyKey?.startsWith("event:") ? t("runs_.event") : t("runs_.manual")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function duration(ms: number, t: (key: string, values?: Record<string, number>) => string) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return t("durationSeconds", { count: seconds });
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return t("durationMinutes", { count: minutes });
  return t("durationHours", { count: Math.round(minutes / 60) });
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-large border border-default-200 bg-content1 p-4">
      <p className="text-tiny text-default-500">{label}</p>
      <p className={tone === "danger" ? "mt-1 text-xl font-semibold text-danger" : "mt-1 text-xl font-semibold"}>{value}</p>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: "active" | "inactive" | "draft"; label: string }) {
  const cls = status === "active" ? "bg-success-100 text-success-700" : status === "draft" ? "bg-warning-100 text-warning-700" : "bg-default-100 text-default-600";
  return <span className={`rounded-small px-2 py-0.5 text-small font-medium ${cls}`}>{label}</span>;
}
