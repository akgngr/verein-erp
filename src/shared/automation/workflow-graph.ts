import { z } from "zod";

/**
 * Canonical workflow model.
 *
 * The visual editor produces "authoring JSON" (nodes/edges from the Workflow
 * Builder SDK). It is never executed. `compileWorkflow` converts it into this
 * canonical, validated graph; the runtime executes only the canonical form that
 * was stored in an immutable workflow version.
 */

export const WORKFLOW_SCHEMA_VERSION = 1;

export const WORKFLOW_LIMITS = Object.freeze({
  maxNodes: 50,
  maxEdges: 100,
  maxDepth: 25,
  maxFanOut: 10,
  maxPayloadBytes: 32 * 1024,
  maxDelayMinutes: 60 * 24 * 90,
  /** Total run duration before the runtime fails a run. */
  maxRunDays: 120,
});

export const NODE_KINDS = ["trigger", "task", "condition", "parallel", "delay", "approval"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const CONDITION_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "exists", "notExists"] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

const nodeId = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const label = z.string().trim().max(120).default("");
const path = z.string().trim().max(200).regex(/^(trigger|steps)(\.[A-Za-z0-9_-]+)*$/);

const triggerConfig = z.object({
  triggerType: z.enum(["manual", "event"]),
  eventKey: z.string().max(120).optional(),
}).strict();

const taskConfig = z.object({
  taskKey: z.string().min(3).max(120),
  /** Input object; string values may be a single `{{path}}` reference. */
  input: z.record(z.string().max(64), z.unknown()).default({}),
}).strict();

const conditionConfig = z.object({
  field: path,
  operator: z.enum(CONDITION_OPERATORS),
  value: z.string().max(500).default(""),
}).strict();

const delayConfig = z.object({
  minutes: z.number().int().min(1).max(WORKFLOW_LIMITS.maxDelayMinutes).optional(),
  until: z.string().datetime({ offset: true }).optional(),
}).strict().refine((value) => (value.minutes === undefined) !== (value.until === undefined), {
  message: "WORKFLOW_DELAY_CONFIG_INVALID",
});

const approvalConfig = z.object({ note: z.string().max(500).default("") }).strict();
const emptyConfig = z.object({}).strict();

export const canonicalNodeSchema = z.discriminatedUnion("kind", [
  z.object({ id: nodeId, kind: z.literal("trigger"), label, config: triggerConfig }),
  z.object({ id: nodeId, kind: z.literal("task"), label, config: taskConfig }),
  z.object({ id: nodeId, kind: z.literal("condition"), label, config: conditionConfig }),
  z.object({ id: nodeId, kind: z.literal("parallel"), label, config: emptyConfig }),
  z.object({ id: nodeId, kind: z.literal("delay"), label, config: delayConfig }),
  z.object({ id: nodeId, kind: z.literal("approval"), label, config: approvalConfig }),
]);

export const canonicalGraphSchema = z.object({
  schemaVersion: z.literal(WORKFLOW_SCHEMA_VERSION),
  nodes: z.array(canonicalNodeSchema).min(2).max(WORKFLOW_LIMITS.maxNodes),
  edges: z.array(z.object({ from: nodeId, to: nodeId }).strict()).max(WORKFLOW_LIMITS.maxEdges),
}).strict();

export type CanonicalNode = z.infer<typeof canonicalNodeSchema>;
export type CanonicalGraph = z.infer<typeof canonicalGraphSchema>;

/** Registry facts the validator needs; supplied by trusted server code. */
export type WorkflowCatalog = {
  tasks: Map<string, { inputSchema: z.ZodType; workflowEnabled: boolean }>;
  events: Set<string>;
  /** Allowed {{...}} references per event key, e.g. "trigger.memberId", "member.fullName". */
  references?: Map<string, Set<string>>;
};

export class WorkflowValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("WORKFLOW_INVALID");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const TASK_NODE_PREFIX = "task.";

/** Editor property holding the chosen value for an enum field ("trigger.status" → "value_trigger_status"). Legacy (pre trigger-aware conditions). */
export function conditionValueKey(field: string): string {
  return `value_${field.replace(/[^A-Za-z0-9]/g, "_")}`;
}

/**
 * Koşul değeri seçenekleri: liste (enum) alanları kendi seçenekleri, evet/hayır alanları true/false;
 * diğerleri elle yazılır (undefined).
 */
export function conditionValueChoices(field: { type: string; options?: { value: string; label: string }[] }, labels: { yes: string; no: string }): { value: string; label: string }[] | undefined {
  if (field.options?.length) return field.options;
  if (field.type === "boolean") return [{ value: "true", label: labels.yes }, { value: "false", label: labels.no }];
  return undefined;
}

/** Sentinel option meaning "enter the value manually". */
export const CUSTOM_VALUE = "__custom__";
/** Sentinel field option meaning "type a field path manually". */
export const CUSTOM_FIELD = "custom";

const slug = (value: string) => value.replace(/[^A-Za-z0-9]/g, "_");

/**
 * Editor property names of trigger-aware conditions. Each event gets its own
 * field list, and each field its own value list and manual text, so the form
 * can show only what fits the workflow's trigger.
 */
export const conditionKeys = {
  field: (eventKey: string) => `field__${slug(eventKey)}`,
  value: (eventKey: string, field: string) => `value__${slug(eventKey)}__${slug(field)}`,
  text: (eventKey: string, field: string) => `valueText__${slug(eventKey)}__${slug(field)}`,
};

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** Resolve the condition's field path and value from editor properties. */
export function resolveConditionProps(props: Record<string, unknown>, triggerEventKey: string): { field: unknown; value: string } {
  const chosen = triggerEventKey ? props[conditionKeys.field(triggerEventKey)] : undefined;
  if (typeof chosen === "string" && chosen && chosen !== CUSTOM_FIELD) {
    const listed = props[conditionKeys.value(triggerEventKey, chosen)];
    const value = typeof listed === "string" && listed && listed !== CUSTOM_VALUE
      ? listed
      : str(props[conditionKeys.text(triggerEventKey, chosen)]);
    return { field: `trigger.${chosen}`, value };
  }
  if (chosen === CUSTOM_FIELD || triggerEventKey === "" && typeof props.customField === "string" && props.customField) {
    return { field: typeof props.customField === "string" ? props.customField.trim() : props.customField, value: str(props.value) };
  }
  // Legacy shape: a single "field" select (+ optional per-field enum list).
  const legacyField = props.field === CUSTOM_FIELD ? props.customField : props.field;
  const legacyList = typeof props.field === "string" ? props[conditionValueKey(props.field)] : undefined;
  const value = legacyList !== undefined && legacyList !== null && legacyList !== "" ? legacyList : props.value;
  return { field: typeof legacyField === "string" ? legacyField.trim() : legacyField, value: str(value) };
}
const RESERVED_PROPS = new Set(["label", "description", "errors", "customErrors"]);

/** Date inputs may omit the offset ("2026-12-01T09:00"); interpret them in the server time zone. */
function normalizeDateTime(value: string): string {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function parseInputText(value: unknown): unknown {
  if (typeof value !== "string") return value ?? {};
  const trimmed = value.trim();
  if (trimmed === "") return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return Symbol.for("invalid-json");
  }
}

/**
 * Convert editor JSON (Workflow Builder `nodes`/`edges`) into the canonical
 * graph. Unknown node types and malformed properties become validation issues;
 * nothing from the editor is passed through unchecked.
 */
export function compileWorkflow(editor: unknown): { graph?: CanonicalGraph; issues: string[] } {
  const issues: string[] = [];
  const root = asRecord(editor);
  const rawNodes = Array.isArray(root.nodes) ? root.nodes : [];
  const rawEdges = Array.isArray(root.edges) ? root.edges : [];

  if (JSON.stringify(editor ?? null).length > 512 * 1024) {
    return { issues: ["WORKFLOW_TOO_LARGE"] };
  }

  // Condition fields depend on the trigger's event; read it once up front.
  const triggerProps = asRecord(asRecord(asRecord(rawNodes.find((raw) => asRecord(asRecord(raw).data).type === "trigger")).data).properties);
  const triggerEventKey = triggerProps.triggerType === "event" && typeof triggerProps.eventKey === "string" ? triggerProps.eventKey : "";

  const nodes: unknown[] = rawNodes.map((raw) => {
    const node = asRecord(raw);
    const data = asRecord(node.data);
    const props = asRecord(data.properties);
    const type = typeof data.type === "string" ? data.type : "";
    const base = { id: node.id, label: typeof props.label === "string" ? props.label : "" };

    // One palette item per task: "task.<taskKey>"; form fields are the input.
    if (type.startsWith(TASK_NODE_PREFIX)) {
      const input = Object.fromEntries(Object.entries(props)
        .filter(([key, value]) => !RESERVED_PROPS.has(key) && value !== "" && value !== undefined && value !== null));
      return { ...base, kind: "task", config: { taskKey: type.slice(TASK_NODE_PREFIX.length), input } };
    }

    switch (type) {
      case "trigger":
        return { ...base, kind: type, config: { triggerType: props.triggerType ?? "manual", ...(props.triggerType === "event" && props.eventKey ? { eventKey: props.eventKey } : {}) } };
      case "task": {
        const input = parseInputText(props.input);
        if (input === Symbol.for("invalid-json")) issues.push(`NODE_INPUT_JSON_INVALID:${String(node.id)}`);
        return { ...base, kind: type, config: { taskKey: props.taskKey, input: typeof input === "symbol" ? {} : input } };
      }
      case "condition": {
        const resolved = resolveConditionProps(props, triggerEventKey);
        // Değer gerektiren karşılaştırmada boş değer: yayımlamadan önce açıkça uyar (sessizce "" ile karşılaştırma).
        if (props.operator !== "exists" && props.operator !== "notExists" && resolved.value === "") issues.push(`CONDITION_VALUE_MISSING:${String(node.id)}`);
        return { ...base, kind: type, config: { field: resolved.field, operator: props.operator, value: resolved.value } };
      }
      case "parallel":
        return { ...base, kind: type, config: {} };
      case "delay": {
        if (props.mode === "until") {
          const until = typeof props.until === "string" && props.until.trim() ? props.until.trim() : undefined;
          return { ...base, kind: type, config: until ? { until: normalizeDateTime(until) } : {} };
        }
        const amount = props.amount ?? props.minutes;
        const factor = props.unit === "days" ? 1440 : props.unit === "hours" ? 60 : 1;
        const minutes = amount === undefined || amount === "" || amount === null ? undefined : Math.round(Number(amount) * factor);
        return { ...base, kind: type, config: minutes !== undefined ? { minutes } : {} };
      }
      case "approval":
        return { ...base, kind: type, config: { note: typeof props.note === "string" ? props.note : "" } };
      default:
        issues.push(`NODE_KIND_UNSUPPORTED:${String(node.id)}`);
        return null;
    }
  }).filter(Boolean);

  const edges = rawEdges.map((raw) => {
    const edge = asRecord(raw);
    return { from: edge.source, to: edge.target };
  });

  const parsed = canonicalGraphSchema.safeParse({ schemaVersion: WORKFLOW_SCHEMA_VERSION, nodes, edges });
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 20)) {
      const where = issue.path.join(".");
      issues.push(`SCHEMA:${where}:${issue.message}`.slice(0, 200));
    }
    return { issues };
  }
  return { graph: parsed.data, issues };
}

/** Structural + catalog validation. Returns issue codes; empty means publishable. */
export function validateWorkflow(graph: CanonicalGraph, catalog: WorkflowCatalog): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (ids.has(node.id)) issues.push(`NODE_DUPLICATE:${node.id}`);
    ids.add(node.id);
  }

  const triggers = graph.nodes.filter((node) => node.kind === "trigger");
  if (triggers.length !== 1) issues.push("TRIGGER_COUNT_INVALID");

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const seenEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      issues.push(`EDGE_REFERENCE_INVALID:${edge.from}->${edge.to}`);
      continue;
    }
    if (edge.from === edge.to) issues.push(`EDGE_SELF_LOOP:${edge.from}`);
    const key = `${edge.from}->${edge.to}`;
    if (seenEdges.has(key)) issues.push(`EDGE_DUPLICATE:${key}`);
    seenEdges.add(key);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge.from]);
  }

  for (const [id, targets] of outgoing) {
    if (targets.length > WORKFLOW_LIMITS.maxFanOut) issues.push(`FAN_OUT_TOO_LARGE:${id}`);
  }

  const trigger = triggers[0];
  if (trigger) {
    if ((incoming.get(trigger.id) ?? []).length > 0) issues.push("TRIGGER_HAS_INCOMING");
    const config = trigger.config as { triggerType: string; eventKey?: string };
    if (config.triggerType === "event" && (!config.eventKey || !catalog.events.has(config.eventKey))) {
      issues.push("TRIGGER_EVENT_UNKNOWN");
    }
  }

  // Cycles (Kahn) and depth.
  const indegree = new Map([...ids].map((id) => [id, (incoming.get(id) ?? []).length]));
  const depth = new Map<string, number>();
  const queue = [...ids].filter((id) => indegree.get(id) === 0);
  for (const id of queue) depth.set(id, 1);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited += 1;
    for (const next of outgoing.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 1, (depth.get(id) ?? 1) + 1));
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (visited !== ids.size) issues.push("GRAPH_HAS_CYCLE");
  if (Math.max(0, ...depth.values()) > WORKFLOW_LIMITS.maxDepth) issues.push("GRAPH_TOO_DEEP");

  // Reachability from the trigger.
  if (trigger) {
    const reached = new Set([trigger.id]);
    const stack = [trigger.id];
    while (stack.length) {
      for (const next of outgoing.get(stack.pop()!) ?? []) {
        if (!reached.has(next)) {
          reached.add(next);
          stack.push(next);
        }
      }
    }
    for (const id of ids) if (!reached.has(id)) issues.push(`NODE_UNREACHABLE:${id}`);
  }

  for (const node of graph.nodes) {
    if (node.kind !== "task") continue;
    const task = catalog.tasks.get(node.config.taskKey);
    if (!task || !task.workflowEnabled) {
      issues.push(`TASK_NOT_AVAILABLE:${node.id}`);
      continue;
    }
    // Inputs with references are checked again at runtime after resolution.
    const checked = task.inputSchema.safeParse(stripReferences(node.config.input, task.inputSchema));
    if (!checked.success) {
      const fields = [...new Set(checked.error.issues.map((issue) => String(issue.path[0] ?? "")))].filter(Boolean);
      issues.push(`TASK_INPUT_INVALID:${node.id}${fields.length ? `:${fields.join(",")}` : ""}`);
    }
    // Unknown {{...}} references would be sent verbatim; catch typos at publish.
    const triggerEvent = trigger?.kind === "trigger" ? trigger.config.eventKey : undefined;
    if (catalog.references) {
      // Event triggers have a known payload; manual triggers accept any {{trigger.*}}.
      const allowed = triggerEvent ? catalog.references.get(triggerEvent) ?? new Set<string>() : null;
      const unknown = Object.values(node.config.input)
        .filter((value): value is string => typeof value === "string")
        .flatMap(templatePaths)
        .filter((path) => path !== "uuid" && !path.startsWith("steps.") && (allowed ? !allowed.has(path) : !path.startsWith("trigger.")));
      if (unknown.length) issues.push(`TASK_UNKNOWN_REFERENCE:${node.id}:${[...new Set(unknown)].join(",")}`);
    }
    if (JSON.stringify(node.config.input).length > WORKFLOW_LIMITS.maxPayloadBytes) {
      issues.push(`TASK_INPUT_TOO_LARGE:${node.id}`);
    }
  }

  return issues;
}

const REFERENCE = /^\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}$/;

/**
 * Validate static values now; referenced values are only known at runtime, so
 * they are dropped from the check unless the field is otherwise missing.
 */
function stripReferences(input: Record<string, unknown>, schema: z.ZodType): Record<string, unknown> {
  const shape = schema instanceof z.ZodObject ? schema.shape as Record<string, z.ZodType> : {};
  return Object.fromEntries(Object.entries(input).map(([key, value]) => {
    if (typeof value !== "string" || !REFERENCE.test(value)) return [key, value];
    // Replace with a sample that satisfies the field so only static values are judged.
    const field = shape[key];
    const sample = field?.safeParse("x@example.org").success ? "x@example.org"
      : field?.safeParse("00000000-0000-4000-8000-000000000000").success ? "00000000-0000-4000-8000-000000000000"
      : field?.safeParse(1).success ? 1 : "x";
    return [key, sample];
  }));
}


export type RunContext = { trigger: unknown; steps: Record<string, unknown> };

/** Read a dotted path ("trigger.memberId", "steps.n1.sent") from the run context. */
export function readPath(context: RunContext, dotted: string): unknown {
  let current: unknown = context;
  for (const segment of dotted.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Resolve `{{path}}` references. Only whole-string references are supported so
 * values keep their type; there is no expression language and no code. The
 * special reference `{{uuid}}` yields a fresh identifier.
 */
export function resolveTemplates(value: unknown, context: RunContext, uuid: () => string): unknown {
  if (typeof value === "string") {
    const match = REFERENCE.exec(value);
    if (match) {
      if (match[1] === "uuid") return uuid();
      // Only run-context namespaces are resolved here; others (e.g. {{member.x}})
      // are deferred to the task, which loads them without persisting them.
      return isRunPath(match[1]) ? readPath(context, match[1]) : value;
    }
    return renderInlineTemplate(value, (path) => {
      if (path === "uuid") return uuid();
      return isRunPath(path) ? readPath(context, path) : undefined;
    });
  }
  if (Array.isArray(value)) return value.map((item) => resolveTemplates(item, context, uuid));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTemplates(item, context, uuid)]));
  }
  return value;
}

const INLINE_REFERENCE = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

function isRunPath(path: string): boolean {
  return path.startsWith("trigger.") || path.startsWith("steps.");
}

/**
 * Replace every {{path}} inside a text. Unresolved references (lookup returns
 * undefined) are kept verbatim so a later stage can fill them.
 */
export function renderInlineTemplate(text: string, lookup: (path: string) => unknown): string {
  return text.replace(INLINE_REFERENCE, (whole, path: string) => {
    const value = lookup(path);
    if (value === undefined) return whole;
    if (value === null) return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

/** Paths referenced in a text, e.g. ["member.fullName"]. */
export function templatePaths(text: string): string[] {
  return [...text.matchAll(INLINE_REFERENCE)].map((match) => match[1]);
}

export function evaluateCondition(
  config: { field: string; operator: ConditionOperator; value: string },
  context: RunContext,
): boolean {
  const actual = readPath(context, config.field);
  if (config.operator === "exists") return actual !== undefined && actual !== null && actual !== "";
  if (config.operator === "notExists") return actual === undefined || actual === null || actual === "";
  const expected = config.value;
  const bothNumeric = typeof actual !== "boolean" && actual !== null && actual !== "" &&
    Number.isFinite(Number(actual)) && expected.trim() !== "" && Number.isFinite(Number(expected));
  const left = bothNumeric ? Number(actual) : String(actual ?? "");
  const right = bothNumeric ? Number(expected) : expected;
  switch (config.operator) {
    case "eq": return left === right;
    case "neq": return left !== right;
    case "gt": return left > right;
    case "gte": return left >= right;
    case "lt": return left < right;
    case "lte": return left <= right;
    case "contains": return String(actual ?? "").includes(expected);
  }
}

export function topologicalOrder(graph: CanonicalGraph): string[] {
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const queue = graph.nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const edge of graph.edges) {
      if (edge.from !== id) continue;
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) - 1);
      if (incoming.get(edge.to) === 0) queue.push(edge.to);
    }
  }
  return order;
}

/** Step states the planner understands (mirrors persisted step statuses). */
export type PlannerStepState =
  | { status: "SUCCEEDED"; passed: boolean }
  | { status: "SKIPPED" | "FAILED" | "CANCELLED" }
  | { status: "RUNNING" | "WAITING" | "PENDING" | "RETRYING" };

export type PlannerAction =
  | { type: "complete"; nodeId: string; passed: boolean; result: unknown }
  | { type: "skip"; nodeId: string }
  | { type: "startTask"; nodeId: string }
  | { type: "wait"; nodeId: string; until: Date | null };

/**
 * Pure planning step: given current step states, return the actions that can
 * be taken now. Dead-path elimination: a node whose predecessors are all
 * resolved but none "passed" is skipped, which in turn resolves its successors.
 * Call repeatedly until it returns no actions.
 */
export function planWorkflow(
  graph: CanonicalGraph,
  states: Map<string, PlannerStepState>,
  context: RunContext,
  now: Date,
): PlannerAction[] {
  const actions: PlannerAction[] = [];
  const predecessors = new Map<string, string[]>();
  for (const edge of graph.edges) predecessors.set(edge.to, [...(predecessors.get(edge.to) ?? []), edge.from]);

  for (const id of topologicalOrder(graph)) {
    if (states.has(id)) continue;
    const node = graph.nodes.find((item) => item.id === id)!;
    const preds = predecessors.get(id) ?? [];

    if (node.kind === "trigger") {
      actions.push({ type: "complete", nodeId: id, passed: true, result: context.trigger ?? {} });
      continue;
    }

    const predStates = preds.map((pred) => states.get(pred));
    if (predStates.some((state) => !state || !["SUCCEEDED", "SKIPPED", "FAILED", "CANCELLED"].includes(state.status))) continue;
    const active = predStates.some((state) => state?.status === "SUCCEEDED" && state.passed);
    if (!active) {
      actions.push({ type: "skip", nodeId: id });
      continue;
    }

    switch (node.kind) {
      case "parallel":
        actions.push({ type: "complete", nodeId: id, passed: true, result: {} });
        break;
      case "condition": {
        const passed = evaluateCondition(node.config, context);
        actions.push({ type: "complete", nodeId: id, passed, result: { passed } });
        break;
      }
      case "task":
        actions.push({ type: "startTask", nodeId: id });
        break;
      case "delay": {
        const until = node.config.until
          ? new Date(node.config.until)
          : new Date(now.getTime() + (node.config.minutes ?? 0) * 60_000);
        actions.push({ type: "wait", nodeId: id, until });
        break;
      }
      case "approval":
        actions.push({ type: "wait", nodeId: id, until: null });
        break;
    }
  }
  return actions;
}

/** Key-order independent JSON (PostgreSQL jsonb reorders object keys). */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}
