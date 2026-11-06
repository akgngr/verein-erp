import { NodeType, type PaletteItemOrGroup } from "@workflowbuilder/sdk";

import { CONDITION_OPERATORS } from "@/shared/automation/workflow-graph";

export const NODE_ICONS: Record<string, "Lightning" | "Gear" | "GitBranch" | "ArrowsSplit" | "Timer" | "SealCheck"> = {
  trigger: "Lightning",
  task: "Gear",
  condition: "GitBranch",
  parallel: "ArrowsSplit",
  delay: "Timer",
  approval: "SealCheck",
};

export type EditorCatalogProps = {
  tasks: { key: string; module: string; defaultInput: Record<string, unknown> }[];
  events: { key: string; module: string; fields: string[] }[];
};

export type NodeLabels = {
  group: string;
  trigger: string; triggerDesc: string; triggerType: string; manual: string; event: string; eventKey: string;
  task: string; taskDesc: string; taskKey: string; input: string;
  condition: string; conditionDesc: string; field: string; operator: string; value: string;
  parallel: string; parallelDesc: string;
  delay: string; delayDesc: string; minutes: string; until: string;
  approval: string; approvalDesc: string; note: string;
  name: string; description: string;
};

const text = (label: string) => ({ type: "string" as const, label });
const base = (labels: NodeLabels) => ({ label: text(labels.name), description: text(labels.description) });
const control = (scope: string, label: string, type = "Text") => ({ type, scope: `#/properties/${scope}`, label });
const layout = (...elements: unknown[]) => ({ type: "VerticalLayout", elements });

/**
 * Palette built only from the trusted catalog: registered workflow tasks and
 * events. There is no code node; every value is re-validated on the server.
 */
export function buildNodeTypes(catalog: EditorCatalogProps, labels: NodeLabels): PaletteItemOrGroup[] {
  const firstTask = catalog.tasks[0];
  const items = [
    {
      type: "trigger",
      icon: "Lightning",
      label: labels.trigger,
      description: labels.triggerDesc,
      templateType: NodeType.StartNode,
      isStartNode: true,
      schema: {
        type: "object",
        properties: {
          ...base(labels),
          triggerType: { ...text(labels.triggerType), options: [{ label: labels.manual, value: "manual" }, { label: labels.event, value: "event" }] },
          eventKey: { ...text(labels.eventKey), options: catalog.events.map((event) => ({ label: event.key, value: event.key })) },
        },
      },
      uischema: layout(control("label", labels.name), control("triggerType", labels.triggerType, "Select"), control("eventKey", labels.eventKey, "Select")),
      defaultPropertiesData: { label: labels.trigger, description: "", triggerType: "manual", eventKey: "" },
    },
    {
      type: "task",
      icon: "Gear",
      label: labels.task,
      description: labels.taskDesc,
      templateType: NodeType.Node,
      schema: {
        type: "object",
        properties: {
          ...base(labels),
          taskKey: { ...text(labels.taskKey), options: catalog.tasks.map((task) => ({ label: task.key, value: task.key })) },
          input: text(labels.input),
        },
      },
      uischema: layout(control("label", labels.name), control("taskKey", labels.taskKey, "Select"), control("input", labels.input, "TextArea")),
      defaultPropertiesData: {
        label: labels.task,
        description: "",
        taskKey: firstTask?.key ?? "",
        input: JSON.stringify(firstTask?.defaultInput ?? {}, null, 2),
      },
    },
    {
      type: "condition",
      icon: "GitBranch",
      label: labels.condition,
      description: labels.conditionDesc,
      templateType: NodeType.Node,
      schema: {
        type: "object",
        properties: {
          ...base(labels),
          field: text(labels.field),
          operator: { ...text(labels.operator), options: CONDITION_OPERATORS.map((op) => ({ label: op, value: op })) },
          value: text(labels.value),
        },
      },
      uischema: layout(control("label", labels.name), control("field", labels.field), control("operator", labels.operator, "Select"), control("value", labels.value)),
      defaultPropertiesData: { label: labels.condition, description: "", field: "trigger.", operator: "eq", value: "" },
    },
    {
      type: "parallel",
      icon: "ArrowsSplit",
      label: labels.parallel,
      description: labels.parallelDesc,
      templateType: NodeType.Node,
      schema: { type: "object", properties: base(labels) },
      uischema: layout(control("label", labels.name)),
      defaultPropertiesData: { label: labels.parallel, description: "" },
    },
    {
      type: "delay",
      icon: "Timer",
      label: labels.delay,
      description: labels.delayDesc,
      templateType: NodeType.Node,
      schema: {
        type: "object",
        properties: { ...base(labels), minutes: { type: "number", label: labels.minutes, minimum: 1 }, until: text(labels.until) },
      },
      uischema: layout(control("label", labels.name), control("minutes", labels.minutes), control("until", labels.until)),
      defaultPropertiesData: { label: labels.delay, description: "", minutes: 60, until: "" },
    },
    {
      type: "approval",
      icon: "SealCheck",
      label: labels.approval,
      description: labels.approvalDesc,
      templateType: NodeType.Node,
      schema: { type: "object", properties: { ...base(labels), note: text(labels.note) } },
      uischema: layout(control("label", labels.name), control("note", labels.note, "TextArea")),
      defaultPropertiesData: { label: labels.approval, description: "", note: "" },
    },
  ];
  return [{ label: labels.group, groupItems: items, isOpen: true }] as unknown as PaletteItemOrGroup[];
}
