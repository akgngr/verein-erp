import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import type { CanonicalGraph } from "@/shared/automation/workflow-graph";
import { getDb } from "@/shared/db";

import { ExecutionStatusChip } from "../components/execution-status-chip";
import { WorkflowEditorPanel } from "../components/workflow-editor-panel";
import type { NodeLabels } from "../editor/node-types";
import { automationPermissions } from "../permissions";
import { editorCatalog, getWorkflow, listWorkflowRuns } from "../services/workflows";

const NODE_LABEL_KEYS = [
  "group", "trigger", "triggerDesc", "triggerType", "manual", "event", "eventKey",
  "task", "taskDesc", "taskKey", "input", "condition", "conditionDesc", "field", "operator", "value",
  "parallel", "parallelDesc", "delay", "delayDesc", "minutes", "until", "approval", "approvalDesc", "note",
  "name", "description",
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

  const [t, tn, tm, format, runs] = await Promise.all([
    getTranslations("automation.workflows"),
    getTranslations("automation.workflows.nodes"),
    getTranslations("automation.monitor"),
    getFormatter(),
    listWorkflowRuns(id),
  ]);
  const labels = Object.fromEntries(NODE_LABEL_KEYS.map((key) => [key, tn(key)])) as NodeLabels;
  const active = workflow.activeVersionId
    ? await getDb().automationWorkflowVersion.findUnique({ where: { id: workflow.activeVersionId }, select: { graph: true, version: true } })
    : null;
  const trigger = (active?.graph as CanonicalGraph | undefined)?.nodes.find((node) => node.kind === "trigger");
  const manualTrigger = trigger?.kind === "trigger" && trigger.config.triggerType === "manual";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={workflow.name}
        description={active ? t("activeVersion", { version: active.version }) : t("draftOnly")}
      />
      <WorkflowEditorPanel
        id={workflow.id}
        name={workflow.name}
        draft={(workflow.draft ?? {}) as { nodes?: unknown[]; edges?: unknown[] }}
        catalog={editorCatalog()}
        labels={labels}
        enabled={workflow.enabled}
        published={Boolean(active)}
        manualTrigger={manualTrigger}
        canEdit={can(user.role, automationPermissions, "update")}
        canPublish={can(user.role, automationPermissions, "approve")}
        canRun={can(user.role, automationPermissions, "update")}
        canDelete={can(user.role, automationPermissions, "delete")}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-medium font-semibold">{t("runs")}</h2>
        {runs.length === 0 ? (
          <p className="rounded-large border border-default-200 p-5 text-small text-default-500">{t("noRuns")}</p>
        ) : runs.map((run) => (
          <article key={run.id} className="rounded-large border border-default-200 bg-content1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-small text-default-600">
                v{run.definitionVersion} · {format.dateTime(run.createdAt, { dateStyle: "short", timeStyle: "medium" })}
                {run.lastErrorCode ? <span className="ms-2 font-medium text-danger">{run.lastErrorCode}</span> : null}
              </p>
              <ExecutionStatusChip status={run.status} label={tm(`status.${run.status}` as never)} />
            </div>
            <ol className="mt-3 flex flex-wrap gap-2">
              {run.steps.map((step) => (
                <li key={step.id} className="rounded-medium bg-default-100 px-2 py-1 text-tiny">
                  <span className="font-medium">{step.stepKey}</span> · {step.taskKey} · {t(`stepStatus.${step.status}` as never)}
                  {step.lastErrorCode ? <span className="text-danger"> · {step.lastErrorCode}</span> : null}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </div>
  );
}
