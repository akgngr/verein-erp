import "server-only";

import { getDb } from "@/shared/db";

import { renderInlineTemplate, templatePaths } from "./workflow-graph";
import { automationTrace } from "./trace";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/**
 * Fill deferred record variables such as {{member.fullName}} in task texts.
 *
 * Runs inside the worker when a workflow task executes: finds the workflow run
 * and its trigger event, asks the event's trusted loader for the record fields
 * and renders the texts in memory. Nothing is persisted. Texts outside a
 * workflow, or references the event does not provide, stay unchanged.
 */
export async function renderWorkflowVariables<T extends Record<string, string>>(executionId: string, texts: T): Promise<T> {
  const needed = Object.values(texts).flatMap(templatePaths).filter((path) => path.includes("."));
  if (needed.length === 0) return texts;

  const db = getDb();
  const execution = await db.automationExecution.findUnique({ where: { id: executionId }, select: { context: true } });
  const runId = asRecord(execution?.context).workflowRunId;
  if (typeof runId !== "string") return texts;
  const run = await db.automationExecution.findUnique({ where: { id: runId }, select: { input: true, context: true } });
  const versionId = asRecord(run?.context).versionId;
  if (typeof versionId !== "string") return texts;
  const version = await db.automationWorkflowVersion.findUnique({ where: { id: versionId }, select: { graph: true } });
  const nodes = (asRecord(version?.graph).nodes ?? []) as { kind?: string; config?: { eventKey?: string } }[];
  const eventKey = nodes.find((node) => node.kind === "trigger")?.config?.eventKey;
  if (!eventKey) return texts;

  const { moduleAutomationEvents } = await import("@/automation-registry");
  const event = moduleAutomationEvents.find((item) => item.key === eventKey);
  if (!event?.variables) return texts;
  const namespace = event.variables.namespace;
  if (!needed.some((path) => path.startsWith(`${namespace}.`))) return texts;

  const payload = event.payloadSchema.safeParse(run?.input);
  if (!payload.success) return texts;
  const values = await event.variables.load(payload.data);
  const missing = new Set<string>();
  const rendered = Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, renderInlineTemplate(text, (path) => {
    if (!path.startsWith(`${namespace}.`)) return undefined;
    const field = path.slice(namespace.length + 1);
    if (!(field in values)) {
      missing.add(path);
      return undefined;
    }
    return values[field];
  })])) as T;
  automationTrace("variables", "rendered", {
    execution: executionId,
    event: eventKey,
    used: [...new Set(needed)].join(","),
    ...(missing.size ? { unknown: [...missing].join(",") } : {}),
  });
  return rendered;
}
