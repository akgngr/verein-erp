import "server-only";

import { getFormatter, getTranslations } from "next-intl/server";

import {
  compileWorkflow,
  type CanonicalGraph,
  type CanonicalNode,
} from "@/shared/automation/workflow-graph";

import type { EditorCatalog } from "../editor/catalog-types";

export type DescribedNode = { id: string; kind: CanonicalNode["kind"]; title: string; summary: string; depth: number; column: number };
export type DescribedGraph = { nodes: DescribedNode[]; edges: { from: string; to: string }[] };

/** Plain-language description of every step plus a simple layered layout. */
export async function describeGraph(graph: CanonicalGraph, catalog: EditorCatalog): Promise<DescribedGraph> {
  const t = await getTranslations("automation.workflows.describe");
  const ops = await getTranslations("automation.workflows.nodes.operators");
  const format = await getFormatter();

  const fieldLabel = (path: string) => {
    for (const event of catalog.events) {
      const field = event.fields.find((item) => `trigger.${item.name}` === path);
      if (field) return field.label;
    }
    return path;
  };

  const valueLabel = (path: string, value: string) => {
    for (const event of catalog.events) {
      const option = event.fields.find((item) => `trigger.${item.name}` === path)?.options?.find((item) => item.value === value);
      if (option) return option.label;
    }
    return value;
  };

  const describe = (node: CanonicalNode): { title: string; summary: string } => {
    switch (node.kind) {
      case "trigger": {
        const event = catalog.events.find((item) => item.key === node.config.eventKey);
        return node.config.triggerType === "event"
          ? { title: event?.label ?? node.config.eventKey ?? "", summary: t("triggerEvent", { event: event?.label ?? node.config.eventKey ?? "" }) }
          : { title: node.label || t("triggerManualTitle"), summary: t("triggerManual") };
      }
      case "task": {
        const task = catalog.tasks.find((item) => item.key === node.config.taskKey);
        const details = (task?.fields ?? [])
          .filter((field) => !field.hidden && node.config.input[field.name] !== undefined && node.config.input[field.name] !== "")
          .slice(0, 3)
          .map((field) => `${field.label}: ${String(node.config.input[field.name]).slice(0, 80)}`);
        return { title: node.label || task?.label || node.config.taskKey, summary: details.join(" · ") || task?.description || "" };
      }
      case "condition":
        return {
          title: node.label || t("conditionTitle"),
          summary: ["exists", "notExists"].includes(node.config.operator)
            ? `${fieldLabel(node.config.field)} ${ops(node.config.operator)}`
            : `${fieldLabel(node.config.field)} ${ops(node.config.operator)} „${valueLabel(node.config.field, node.config.value)}“`,
        };
      case "delay": {
        if (node.config.until) {
          return { title: node.label || t("delayTitle"), summary: t("waitUntil", { date: format.dateTime(new Date(node.config.until), { dateStyle: "medium", timeStyle: "short" }) }) };
        }
        const minutes = node.config.minutes ?? 0;
        const summary = minutes % 1440 === 0 ? t("waitDays", { count: minutes / 1440 })
          : minutes % 60 === 0 ? t("waitHours", { count: minutes / 60 })
          : t("waitMinutes", { count: minutes });
        return { title: node.label || t("delayTitle"), summary };
      }
      case "approval":
        return { title: node.label || t("approvalTitle"), summary: node.config.note || t("approvalSummary") };
      case "parallel":
        return { title: node.label || t("parallelTitle"), summary: t("parallelSummary") };
    }
  };

  // Layered layout: depth = longest path from the trigger.
  const depth = new Map<string, number>();
  const order = graph.nodes.map((node) => node.id);
  for (let pass = 0; pass < graph.nodes.length; pass += 1) {
    for (const edge of graph.edges) {
      depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(edge.from) ?? 0) + 1));
    }
  }
  const columns = new Map<number, number>();
  const nodes = order.map((id) => {
    const node = graph.nodes.find((item) => item.id === id)!;
    const level = depth.get(id) ?? 0;
    const column = columns.get(level) ?? 0;
    columns.set(level, column + 1);
    return { id, kind: node.kind, depth: level, column, ...describe(node) };
  });
  return { nodes, edges: graph.edges };
}

/** Turn validation codes into sentences that name the step and field. */
export async function describeIssues(issues: string[], draft: unknown, catalog: EditorCatalog): Promise<string[]> {
  const t = await getTranslations("automation.workflows.issues");
  const rawNodes = (draft && typeof draft === "object" && Array.isArray((draft as { nodes?: unknown[] }).nodes))
    ? (draft as { nodes: { id?: string; data?: { type?: string; properties?: { label?: string } } }[] }).nodes
    : [];
  const stepName = (id: string) => rawNodes.find((node) => node.id === id)?.data?.properties?.label || id;
  const fieldName = (id: string, field: string) => {
    const type = rawNodes.find((node) => node.id === id)?.data?.type ?? "";
    const task = catalog.tasks.find((item) => `task.${item.key}` === type);
    return task?.fields.find((item) => item.name === field)?.label ?? field;
  };

  return issues.map((issue) => {
    const [code, id = "", extra = ""] = issue.split(":");
    switch (code) {
      case "TASK_INPUT_INVALID":
        return extra
          ? t("taskInputFields", { step: stepName(id), fields: extra.split(",").map((field) => fieldName(id, field)).join(", ") })
          : t("taskInput", { step: stepName(id) });
      case "TASK_UNKNOWN_REFERENCE": {
        const event = catalog.events.find((item) => rawNodes.some((node) => node.data?.type === "trigger" && (node.data?.properties as { eventKey?: string } | undefined)?.eventKey === item.key));
        const available = event
          ? [...event.fields.map((field) => `{{trigger.${field.name}}}`), ...(event.variables?.fields.map((field) => `{{${event.variables!.namespace}.${field.name}}}`) ?? [])].join(" ")
          : "";
        return t("unknownReference", { step: stepName(id), refs: extra.split(",").map((ref) => `{{${ref}}}`).join(", "), available });
      }
      case "TASK_NOT_AVAILABLE": return t("taskNotAvailable", { step: stepName(id) });
      case "NODE_UNREACHABLE": return t("unreachable", { step: stepName(id) });
      case "NODE_KIND_UNSUPPORTED": return t("unsupported", { step: stepName(id) });
      case "NODE_INPUT_JSON_INVALID": return t("inputJson", { step: stepName(id) });
      case "TRIGGER_COUNT_INVALID": return t("triggerCount");
      case "TRIGGER_HAS_INCOMING": return t("triggerIncoming");
      case "TRIGGER_EVENT_UNKNOWN": return t("triggerEvent");
      case "GRAPH_HAS_CYCLE": return t("cycle");
      case "GRAPH_TOO_DEEP": return t("tooDeep");
      case "FAN_OUT_TOO_LARGE": return t("fanOut", { step: stepName(id) });
      case "EDGE_SELF_LOOP": return t("selfLoop", { step: stepName(id) });
      case "WORKFLOW_TOO_LARGE": return t("tooLarge");
      case "SCHEMA": return issue.includes("nodes:") && issue.includes(">=2") ? t("tooFewSteps") : t("schema", { detail: issue.slice(7, 120) });
      default: return t("generic", { code: issue.slice(0, 120) });
    }
  });
}

/** Graph for display: the active published version, else the compiled draft. */
export function displayGraph(active: unknown, draft: unknown): CanonicalGraph | null {
  if (active && typeof active === "object" && Array.isArray((active as CanonicalGraph).nodes)) return active as CanonicalGraph;
  return compileWorkflow(draft).graph ?? null;
}
