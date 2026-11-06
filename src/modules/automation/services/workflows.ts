import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import {
  compileWorkflow,
  validateWorkflow,
  type CanonicalGraph,
  type WorkflowCatalog,
} from "@/shared/automation/workflow-graph";

import { automationEvents, automationTasks } from "../tasks/registry";
import { assertTaskModulesUsable } from "./execution-control";
import { recordAutomationLog } from "./log-store";
import { createWorkflowRun, queueWorkflowAdvance } from "./workflow-runtime";

export class WorkflowPublishError extends Error {
  constructor(public readonly issues: string[]) {
    super("WORKFLOW_INVALID");
  }
}

/** Trusted facts for the validator and the editor palette. */
export function workflowCatalog(): WorkflowCatalog {
  return {
    tasks: new Map(automationTasks.map((task) => [task.key, { inputSchema: task.inputSchema, workflowEnabled: Boolean(task.workflow) }])),
    events: new Set(automationEvents.map((event) => event.key)),
  };
}

export async function listWorkflows(organizationId = "default") {
  return getDb().automationWorkflow.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { version: true, createdAt: true } } },
  });
}

export async function getWorkflow(id: string, organizationId = "default") {
  return getDb().automationWorkflow.findFirst({
    where: { id, organizationId },
    include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, createdAt: true } } },
  });
}

export async function createWorkflow(input: { name: string; description?: string; actorId: string }) {
  return getDb().automationWorkflow.create({
    data: { name: input.name, description: input.description ?? "", createdById: input.actorId, updatedById: input.actorId },
    select: { id: true },
  });
}

export async function saveWorkflowDraft(id: string, draft: unknown, actorId: string) {
  const size = JSON.stringify(draft ?? {}).length;
  if (size > 512 * 1024) throw new Error("WORKFLOW_TOO_LARGE");
  const updated = await getDb().automationWorkflow.updateMany({
    where: { id },
    data: { draft: JSON.parse(JSON.stringify(draft ?? {})) as Prisma.InputJsonValue, updatedById: actorId },
  });
  if (updated.count === 0) throw new Error("WORKFLOW_NOT_FOUND");
}

export async function renameWorkflow(id: string, name: string, description: string, actorId: string) {
  await getDb().automationWorkflow.updateMany({ where: { id }, data: { name, description, updatedById: actorId } });
}

/** Compile + validate only, for editor feedback. */
export function checkWorkflowDraft(draft: unknown): { graph?: CanonicalGraph; issues: string[] } {
  const compiled = compileWorkflow(draft);
  if (!compiled.graph) return compiled;
  const issues = [...compiled.issues, ...validateWorkflow(compiled.graph, workflowCatalog())];
  return { graph: compiled.graph, issues };
}

/**
 * Publish the current draft as a new immutable version and make it active.
 * Module availability of every used task module is checked here and again
 * when each task runs.
 */
export async function publishWorkflow(id: string, actorId: string) {
  const db = getDb();
  const workflow = await db.automationWorkflow.findUnique({ where: { id } });
  if (!workflow) throw new Error("WORKFLOW_NOT_FOUND");

  const { graph, issues } = checkWorkflowDraft(workflow.draft);
  if (!graph || issues.length > 0) throw new WorkflowPublishError(issues.length ? issues : ["WORKFLOW_INVALID"]);
  for (const node of graph.nodes) {
    if (node.kind === "task") await assertTaskModulesUsable(node.config.taskKey);
  }

  const trigger = graph.nodes.find((node) => node.kind === "trigger");
  const triggerEvent = trigger?.kind === "trigger" && trigger.config.triggerType === "event" ? trigger.config.eventKey ?? null : null;

  return db.$transaction(async (tx) => {
    const latest = await tx.automationWorkflowVersion.findFirst({ where: { workflowId: id }, orderBy: { version: "desc" } });
    const version = await tx.automationWorkflowVersion.create({
      data: { workflowId: id, version: (latest?.version ?? 0) + 1, graph: graph as unknown as Prisma.InputJsonValue, publishedById: actorId },
      select: { id: true, version: true },
    });
    await tx.automationWorkflow.update({
      where: { id },
      data: { activeVersionId: version.id, triggerEvent, enabled: true, updatedById: actorId },
    });
    return version;
  });
}

export async function setWorkflowEnabled(id: string, enabled: boolean, actorId: string) {
  const db = getDb();
  const workflow = await db.automationWorkflow.findUnique({ where: { id }, select: { activeVersionId: true } });
  if (!workflow) throw new Error("WORKFLOW_NOT_FOUND");
  if (enabled && !workflow.activeVersionId) throw new Error("WORKFLOW_NOT_PUBLISHED");
  await db.automationWorkflow.update({ where: { id }, data: { enabled, updatedById: actorId } });
}

export async function deleteWorkflow(id: string) {
  await getDb().automationWorkflow.deleteMany({ where: { id } });
}

/** Start the active version manually (trigger type must be "manual"). */
export async function startWorkflow(workflowId: string, input: unknown, context: { actorId: string | null; organizationId?: string }) {
  const db = getDb();
  const workflow = await db.automationWorkflow.findFirst({ where: { id: workflowId, organizationId: context.organizationId ?? "default" } });
  if (!workflow?.activeVersionId || !workflow.enabled) throw new Error("WORKFLOW_NOT_ACTIVE");
  const version = await db.automationWorkflowVersion.findUnique({ where: { id: workflow.activeVersionId } });
  if (!version) throw new Error("WORKFLOW_NOT_ACTIVE");
  const graph = version.graph as unknown as CanonicalGraph;
  const trigger = graph.nodes.find((node) => node.kind === "trigger");
  if (trigger?.kind !== "trigger" || trigger.config.triggerType !== "manual") throw new Error("WORKFLOW_NOT_MANUAL");

  return db.$transaction((tx) => createWorkflowRun(tx, {
    workflowId: workflow.id,
    workflowName: workflow.name,
    versionId: version.id,
    version: version.version,
    organizationId: workflow.organizationId,
    requestedById: context.actorId,
    trigger: input ?? {},
    idempotencyKey: null,
  }));
}

/** Pending approval steps across active runs. */
export async function listPendingApprovals(organizationId = "default") {
  return getDb().automationStepRun.findMany({
    where: {
      status: "WAITING",
      waitUntil: null,
      taskKey: "workflow.approval",
      execution: { kind: "WORKFLOW", status: "WAITING", organizationId },
    },
    include: { execution: { select: { id: true, context: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

/** Record an approval decision; rejection deactivates the branch after the node. */
export async function decideApproval(stepId: string, approved: boolean, actorId: string) {
  const db = getDb();
  const step = await db.$transaction(async (tx) => {
    const found = await tx.automationStepRun.findUnique({ where: { id: stepId }, include: { execution: { select: { kind: true, status: true } } } });
    if (!found || found.taskKey !== "workflow.approval" || found.execution.kind !== "WORKFLOW") throw new Error("APPROVAL_NOT_FOUND");
    const update = await tx.automationStepRun.updateMany({
      where: { id: stepId, status: "WAITING" },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        decidedById: actorId,
        result: { passed: approved, output: { approved } },
      },
    });
    if (update.count === 0) throw new Error("APPROVAL_ALREADY_DECIDED");
    await queueWorkflowAdvance(tx, found.executionId, "approval");
    return found;
  });
  await recordAutomationLog({
    executionId: step.executionId,
    event: approved ? "WORKFLOW_APPROVED" : "WORKFLOW_REJECTED",
    message: step.stepKey,
    details: { actorId },
  });
}

export async function listWorkflowRuns(workflowId: string, organizationId = "default") {
  return getDb().automationExecution.findMany({
    where: { kind: "WORKFLOW", definitionKey: workflowId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { steps: { orderBy: { createdAt: "asc" } } },
  });
}

/** Last run and 30-day run count per workflow for the list view. */
export async function workflowRunSummaries(organizationId = "default") {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const db = getDb();
  const [last, recent] = await Promise.all([
    db.automationExecution.groupBy({ by: ["definitionKey"], where: { kind: "WORKFLOW", organizationId }, _max: { createdAt: true } }),
    db.automationExecution.groupBy({ by: ["definitionKey"], where: { kind: "WORKFLOW", organizationId, createdAt: { gte: since } }, _count: { _all: true } }),
  ]);
  return new Map([...new Set([...last, ...recent].map((row) => row.definitionKey))].map((key) => [key, {
    lastRunAt: last.find((row) => row.definitionKey === key)?._max.createdAt ?? null,
    runs30d: recent.find((row) => row.definitionKey === key)?._count._all ?? 0,
  }]));
}

/** 30-day statistics for one workflow. */
export async function workflowStats(workflowId: string, organizationId = "default") {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const runs = await getDb().automationExecution.findMany({
    where: { kind: "WORKFLOW", definitionKey: workflowId, organizationId, createdAt: { gte: since } },
    select: { status: true, createdAt: true, finishedAt: true },
  });
  const count = (status: string) => runs.filter((run) => run.status === status).length;
  const finished = runs.filter((run) => run.status === "SUCCEEDED" && run.finishedAt);
  const avgMs = finished.length
    ? finished.reduce((sum, run) => sum + (run.finishedAt!.getTime() - run.createdAt.getTime()), 0) / finished.length
    : null;
  const terminal = count("SUCCEEDED") + count("FAILED");
  return {
    total: runs.length,
    succeeded: count("SUCCEEDED"),
    failed: count("FAILED"),
    waiting: count("WAITING"),
    cancelled: count("CANCELLED"),
    successRate: terminal ? Math.round((count("SUCCEEDED") / terminal) * 100) : null,
    avgMs,
  };
}

export async function listWorkflowVersions(workflowId: string) {
  return getDb().automationWorkflowVersion.findMany({
    where: { workflowId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, createdAt: true, publishedById: true, graph: true },
  });
}
