import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, listActiveUserOptions, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { compileWorkflow, type CanonicalGraph } from "@/shared/automation/workflow-graph";
import { getDb } from "@/shared/db";

import { WorkflowCreateForm } from "../components/workflow-create-form";
import { WorkflowsTable } from "../components/workflows-table";
import { automationPermissions } from "../permissions";
import { buildEditorCatalog } from "../services/workflow-catalog";
import { listWorkflows, workflowRunSummaries } from "../services/workflows";

export async function WorkflowsView() {
  let user;
  try {
    user = await requirePermission(automationPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, format, workflows, summaries, catalog, users] = await Promise.all([
    getTranslations("automation.workflows"),
    getFormatter(),
    listWorkflows(),
    workflowRunSummaries(),
    buildEditorCatalog(),
    listActiveUserOptions(),
  ]);
  const versionIds = workflows.map((workflow) => workflow.activeVersionId).filter((id): id is string => Boolean(id));
  const versions = versionIds.length
    ? await getDb().automationWorkflowVersion.findMany({ where: { id: { in: versionIds } }, select: { id: true, graph: true } })
    : [];

  const triggerLabel = (versionId: string | null, draft: unknown) => {
    const graph = (versions.find((version) => version.id === versionId)?.graph as CanonicalGraph | undefined) ?? compileWorkflow(draft).graph;
    const trigger = graph?.nodes.find((node) => node.kind === "trigger");
    if (trigger?.kind !== "trigger") return t("triggerNotDefined");
    if (trigger.config.triggerType === "manual") return t("manualTrigger");
    return catalog.events.find((event) => event.key === trigger.config.eventKey)?.label ?? trigger.config.eventKey ?? "";
  };

  const rows = workflows.map((workflow) => {
    const summary = summaries.get(workflow.id);
    return {
      id: workflow.id,
      name: workflow.name,
      status: (!workflow.activeVersionId ? "draft" : workflow.enabled ? "active" : "inactive") as "active" | "inactive" | "draft",
      lastRun: summary?.lastRunAt ? format.relativeTime(summary.lastRunAt) : null,
      runs30d: summary?.runs30d ?? 0,
      updated: format.dateTime(workflow.updatedAt, { dateStyle: "medium" }),
      updatedBy: users.find((option) => option.id === workflow.updatedById)?.label ?? null,
      trigger: triggerLabel(workflow.activeVersionId, workflow.draft),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={can(user.role, automationPermissions, "create") ? <WorkflowCreateForm /> : undefined}
      />
      <WorkflowsTable rows={rows} />
    </div>
  );
}
