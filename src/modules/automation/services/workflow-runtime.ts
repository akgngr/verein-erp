import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import {
  canonicalGraphSchema,
  planWorkflow,
  resolveTemplates,
  WORKFLOW_LIMITS,
  type CanonicalGraph,
  type PlannerStepState,
  type RunContext,
} from "@/shared/automation/workflow-graph";

import { findAutomationEvent, findAutomationTask } from "../tasks/registry";
import { insertTaskExecution } from "./execution-store";
import { recordAutomationLog } from "./log-store";

export const WORKFLOW_ADVANCE_EVENT = "automation.workflow.advance";
export const DOMAIN_EVENT = "automation.event";
const WORKFLOW_SOURCE = "automation";
const MAX_PLAN_ROUNDS = 200;
const OUTBOX_BATCH = 20;
const CLAIM_SECONDS = 120;
const OWNER = randomUUID();

type Tx = Prisma.TransactionClient;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/** Queue an advance for a run inside the caller's transaction. */
export async function queueWorkflowAdvance(tx: Tx, runId: string, reason: string): Promise<void> {
  await tx.automationOutbox.create({
    data: {
      eventKey: `${WORKFLOW_ADVANCE_EVENT}:${runId}:${randomUUID()}`,
      eventType: WORKFLOW_ADVANCE_EVENT,
      executionId: runId,
      payload: { runId, reason },
    },
  });
}

/**
 * Create a workflow run for a published version. Uses status WAITING while
 * active: task-only recovery paths (PENDING/RUNNING) never touch workflow runs.
 */
export async function createWorkflowRun(tx: Tx, args: {
  workflowId: string;
  workflowName: string;
  versionId: string;
  version: number;
  organizationId: string;
  requestedById: string | null;
  trigger: unknown;
  idempotencyKey: string | null;
}) {
  if (JSON.stringify(args.trigger ?? {}).length > WORKFLOW_LIMITS.maxPayloadBytes) {
    throw new Error("WORKFLOW_PAYLOAD_TOO_LARGE");
  }
  const run = await tx.automationExecution.create({
    data: {
      kind: "WORKFLOW",
      status: "WAITING",
      definitionKey: args.workflowId,
      definitionVersion: args.version,
      organizationId: args.organizationId,
      requestedById: args.requestedById,
      sourceModule: WORKFLOW_SOURCE,
      correlationId: `workflow:${args.workflowId}`,
      idempotencyKey: args.idempotencyKey,
      input: json(args.trigger),
      context: { versionId: args.versionId, workflowName: args.workflowName.slice(0, 120) },
      maxAttempts: 1,
      startedAt: new Date(),
    },
    select: { id: true },
  });
  await queueWorkflowAdvance(tx, run.id, "started");
  return run;
}

function stepState(step: { status: string; result: unknown }): PlannerStepState {
  if (step.status === "SUCCEEDED") {
    return { status: "SUCCEEDED", passed: asRecord(step.result).passed !== false };
  }
  return { status: step.status as "SKIPPED" };
}

/**
 * Drive a run as far as possible. Serialized per run by a row lock, so it is
 * safe to call concurrently and repeatedly (every call recomputes from state).
 */
export async function advanceWorkflowRun(runId: string, now = new Date()): Promise<void> {
  const db = getDb();
  const events: { level: "INFO" | "WARN" | "ERROR"; event: string; message: string }[] = [];

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "automation_executions" WHERE "id" = ${runId} FOR UPDATE`;
    const run = await tx.automationExecution.findUnique({
      where: { id: runId },
      include: { steps: true },
    });
    if (!run || run.kind !== "WORKFLOW" || run.status !== "WAITING") return;

    const versionId = String(asRecord(run.context).versionId ?? "");
    const version = await tx.automationWorkflowVersion.findUnique({ where: { id: versionId } });
    const parsed = canonicalGraphSchema.safeParse(version?.graph);
    if (!version || !parsed.success) {
      await finishRun(tx, runId, "FAILED", "WORKFLOW_VERSION_INVALID");
      events.push({ level: "ERROR", event: "WORKFLOW_FAILED", message: "WORKFLOW_VERSION_INVALID" });
      return;
    }
    const graph: CanonicalGraph = parsed.data;

    if (run.createdAt.getTime() + WORKFLOW_LIMITS.maxRunDays * 86_400_000 < now.getTime()) {
      await finishRun(tx, runId, "FAILED", "WORKFLOW_RUN_EXPIRED");
      events.push({ level: "ERROR", event: "WORKFLOW_FAILED", message: "WORKFLOW_RUN_EXPIRED" });
      return;
    }

    const steps = new Map(run.steps.map((step) => [step.stepKey, step]));

    // Sync task steps with their child executions and wake elapsed delays.
    for (const step of run.steps) {
      if (step.status === "RUNNING" && step.childExecutionId) {
        const child = await tx.automationExecution.findUnique({
          where: { id: step.childExecutionId },
          include: { steps: { where: { stepKey: "main" }, select: { result: true } } },
        });
        if (!child) continue;
        if (child.status === "SUCCEEDED") {
          const updated = await tx.automationStepRun.update({
            where: { id: step.id },
            data: { status: "SUCCEEDED", finishedAt: now, result: json({ passed: true, output: child.steps[0]?.result ?? null }) },
          });
          steps.set(step.stepKey, updated);
        } else if (child.status === "FAILED" || child.status === "CANCELLED") {
          const updated = await tx.automationStepRun.update({
            where: { id: step.id },
            data: { status: "FAILED", finishedAt: now, lastErrorCode: child.lastErrorCode ?? child.status },
          });
          steps.set(step.stepKey, updated);
        }
      }
      if (step.status === "WAITING" && step.waitUntil && step.waitUntil <= now) {
        const updated = await tx.automationStepRun.update({
          where: { id: step.id },
          data: { status: "SUCCEEDED", finishedAt: now, result: json({ passed: true, output: {} }) },
        });
        steps.set(step.stepKey, updated);
      }
    }

    for (let round = 0; round < MAX_PLAN_ROUNDS; round += 1) {
      const failed = [...steps.values()].find((step) => step.status === "FAILED");
      if (failed) {
        await finishRun(tx, runId, "FAILED", failed.lastErrorCode ?? "WORKFLOW_STEP_FAILED");
        events.push({ level: "ERROR", event: "WORKFLOW_FAILED", message: `${failed.stepKey}: ${failed.lastErrorCode ?? "FAILED"}` });
        return;
      }

      const context: RunContext = {
        trigger: run.input,
        steps: Object.fromEntries([...steps.values()]
          .filter((step) => step.status === "SUCCEEDED")
          .map((step) => [step.stepKey, asRecord(step.result).output ?? null])),
      };
      const states = new Map([...steps.entries()].map(([key, step]) => [key, stepState(step)]));
      const actions = planWorkflow(graph, states, context, now);
      if (actions.length === 0) break;

      for (const action of actions) {
        const node = graph.nodes.find((item) => item.id === action.nodeId)!;
        const base = {
          executionId: runId,
          stepKey: node.id,
          taskKey: node.kind === "task" ? node.config.taskKey : `workflow.${node.kind}`,
          taskVersion: 1,
          maxAttempts: 1,
        };
        if (action.type === "complete") {
          steps.set(node.id, await tx.automationStepRun.create({
            data: { ...base, status: "SUCCEEDED", startedAt: now, finishedAt: now, result: json({ passed: action.passed, output: action.result }) },
          }));
        } else if (action.type === "skip") {
          steps.set(node.id, await tx.automationStepRun.create({
            data: { ...base, status: "SKIPPED", finishedAt: now },
          }));
        } else if (action.type === "wait") {
          steps.set(node.id, await tx.automationStepRun.create({
            data: { ...base, status: "WAITING", startedAt: now, waitUntil: action.until, input: json(node.config) },
          }));
          events.push({ level: "INFO", event: "WORKFLOW_STEP_WAITING", message: `${node.id} (${node.kind})` });
        } else if (action.type === "startTask" && node.kind === "task") {
          const task = findAutomationTask(node.config.taskKey);
          const input = resolveTemplates(node.config.input, context, randomUUID);
          const parsedInput = task?.workflow ? task.inputSchema.safeParse(input) : null;
          if (!task || !task.workflow || !parsedInput?.success) {
            steps.set(node.id, await tx.automationStepRun.create({
              data: { ...base, status: "FAILED", finishedAt: now, lastErrorCode: task ? "TASK_INPUT_INVALID" : "TASK_NOT_REGISTERED" },
            }));
            continue;
          }
          const child = await insertTaskExecution(tx, {
            task,
            organizationId: run.organizationId,
            requestedById: run.requestedById,
            sourceModule: WORKFLOW_SOURCE,
            correlationId: run.correlationId,
            idempotencyKey: `workflow:${runId}:${node.id}`,
            input: json(parsedInput.data),
            context: { locale: "de", workflowRunId: runId, workflowNodeId: node.id },
          });
          steps.set(node.id, await tx.automationStepRun.create({
            data: { ...base, taskVersion: task.version, status: "RUNNING", startedAt: now, input: json(parsedInput.data), childExecutionId: child.id },
          }));
          events.push({ level: "INFO", event: "WORKFLOW_TASK_STARTED", message: `${node.id}: ${task.key}` });
        }
      }
    }

    const allResolved = graph.nodes.every((node) => {
      const status = steps.get(node.id)?.status;
      return status === "SUCCEEDED" || status === "SKIPPED";
    });
    if (allResolved) {
      await finishRun(tx, runId, "SUCCEEDED", null);
      events.push({ level: "INFO", event: "WORKFLOW_SUCCEEDED", message: runId });
    }
  }, { timeout: 30_000 });

  for (const event of events) {
    await recordAutomationLog({ executionId: runId, ...event });
  }
}

async function finishRun(tx: Tx, runId: string, status: "SUCCEEDED" | "FAILED", code: string | null) {
  const now = new Date();
  await tx.automationExecution.updateMany({
    where: { id: runId, status: "WAITING" },
    data: { status, finishedAt: now, lastErrorCode: code },
  });
  await tx.automationStepRun.updateMany({
    where: { executionId: runId, status: { in: ["WAITING", "PENDING"] } },
    data: { status: "CANCELLED", finishedAt: now, lastErrorCode: "WORKFLOW_FINISHED" },
  });
}

/** Start runs for every enabled workflow whose published trigger is this event. */
export async function handleDomainEvent(eventId: string, eventKey: string, data: unknown): Promise<number> {
  const definition = findAutomationEvent(eventKey);
  if (!definition) throw new Error("EVENT_NOT_REGISTERED");
  const parsed = definition.payloadSchema.safeParse(data);
  if (!parsed.success) throw new Error("EVENT_PAYLOAD_INVALID");

  const db = getDb();
  const workflows = await db.automationWorkflow.findMany({
    where: { enabled: true, triggerEvent: eventKey, activeVersionId: { not: null } },
  });
  let started = 0;
  for (const workflow of workflows) {
    const version = await db.automationWorkflowVersion.findUnique({ where: { id: workflow.activeVersionId! } });
    if (!version) continue;
    try {
      await db.$transaction((tx) => createWorkflowRun(tx, {
        workflowId: workflow.id,
        workflowName: workflow.name,
        versionId: version.id,
        version: version.version,
        organizationId: workflow.organizationId,
        requestedById: workflow.updatedById ?? workflow.createdById,
        trigger: parsed.data,
        idempotencyKey: `event:${eventId}:${workflow.id}`,
      }));
      started += 1;
    } catch (error) {
      // Unique violation = this event already started this workflow.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  return started;
}

type ClaimedEvent = { id: string; eventType: string; executionId: string | null; payload: unknown; attempts: number };

/** Process workflow advance + domain events from the outbox (worker only). */
export async function processWorkflowOutboxBatch(now = new Date()): Promise<number> {
  const db = getDb();
  const claimExpiresAt = new Date(now.getTime() + CLAIM_SECONDS * 1000);
  const claimed = await db.$queryRaw<ClaimedEvent[]>(Prisma.sql`
    WITH candidates AS (
      SELECT "id" FROM "automation_outbox"
      WHERE "eventType" IN (${WORKFLOW_ADVANCE_EVENT}, ${DOMAIN_EVENT})
        AND "availableAt" <= ${now}
        AND ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "claimExpiresAt" < ${now}))
      ORDER BY "availableAt" ASC, "createdAt" ASC
      LIMIT ${OUTBOX_BATCH}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "automation_outbox" AS outbox
    SET "status" = 'PROCESSING', "claimOwner" = ${OWNER}, "claimExpiresAt" = ${claimExpiresAt},
        "attempts" = outbox."attempts" + 1, "updatedAt" = ${now}
    FROM candidates WHERE outbox."id" = candidates."id"
    RETURNING outbox."id", outbox."eventType", outbox."executionId", outbox."payload", outbox."attempts"
  `);

  for (const event of claimed) {
    let code: string | null = null;
    try {
      const payload = asRecord(event.payload);
      if (event.eventType === WORKFLOW_ADVANCE_EVENT) {
        await advanceWorkflowRun(String(payload.runId ?? event.executionId ?? ""));
      } else {
        await handleDomainEvent(event.id, String(payload.eventKey ?? ""), payload.data);
      }
    } catch (error) {
      code = (error instanceof Error ? error.message : "WORKFLOW_EVENT_FAILED").slice(0, 80);
      console.warn("[automation:workflow] Olay işlenemedi:", code);
    }
    const permanent = code === "EVENT_NOT_REGISTERED" || code === "EVENT_PAYLOAD_INVALID" || event.attempts >= 10;
    await db.automationOutbox.updateMany({
      where: { id: event.id, claimOwner: OWNER },
      data: code
        ? {
          status: permanent ? "FAILED" : "PENDING",
          availableAt: new Date(Date.now() + Math.min(300, 2 ** event.attempts) * 1000),
          lastErrorCode: code,
          claimOwner: null,
          claimExpiresAt: null,
        }
        : { status: "PUBLISHED", publishedAt: new Date(), lastErrorCode: null, claimOwner: null, claimExpiresAt: null },
    });
  }
  return claimed.length;
}

/** Advance runs whose delay elapsed. Cheap: index on (status, waitUntil). */
export async function wakeDueWorkflowSteps(now = new Date()): Promise<number> {
  const due = await getDb().automationStepRun.findMany({
    where: { status: "WAITING", waitUntil: { lte: now }, execution: { kind: "WORKFLOW", status: "WAITING" } },
    select: { executionId: true },
    distinct: ["executionId"],
    take: 50,
  });
  for (const step of due) await advanceWorkflowRun(step.executionId, now);
  return due.length;
}
