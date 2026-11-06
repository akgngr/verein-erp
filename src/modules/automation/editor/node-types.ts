import { NodeType, type PaletteItemOrGroup } from "@workflowbuilder/sdk";

import { CONDITION_OPERATORS, conditionValueKey, TASK_NODE_PREFIX } from "@/shared/automation/workflow-graph";

import type { EditorCatalog } from "./catalog-types";

export type { EditorCatalog as EditorCatalogProps } from "./catalog-types";

export const NODE_ICONS: Record<string, "Lightning" | "Gear" | "GitBranch" | "ArrowsSplit" | "Timer" | "SealCheck"> = {
  trigger: "Lightning",
  task: "Gear",
  condition: "GitBranch",
  parallel: "ArrowsSplit",
  delay: "Timer",
  approval: "SealCheck",
};

/** Plain-language labels for the editor (from automation.workflows.nodes). */
export type NodeLabels = Record<
  | "groupStart" | "groupActions" | "groupLogic"
  | "trigger" | "triggerDesc" | "triggerType" | "manual" | "event" | "eventKey"
  | "condition" | "conditionDesc" | "field" | "customField" | "customFieldHelp" | "customFieldOption" | "operator" | "value" | "valueHelp"
  | "parallel" | "parallelDesc"
  | "delay" | "delayDesc" | "delayMode" | "delayDuration" | "delayUntil" | "amount" | "unit" | "minutesUnit" | "hoursUnit" | "daysUnit" | "until"
  | "approval" | "approvalDesc" | "note" | "variablesHint"
  | "name",
  string
> & { operators: Record<(typeof CONDITION_OPERATORS)[number], string> };

const option = (value: string, label: string) => ({ value, label });
const control = (scope: string, label: string, type = "Text", extra: Record<string, unknown> = {}) =>
  ({ type, scope: `#/properties/${scope}`, label, ...extra });
const showWhen = (scope: string, value: string) => ({
  rule: { effect: "SHOW", condition: { scope: `#/properties/${scope}`, schema: { const: value } } },
});
const layout = (...elements: unknown[]) => ({ type: "VerticalLayout", elements });
const nameField = (labels: NodeLabels) => ({ label: { type: "string", label: labels.name }, description: { type: "string", label: "" } });

/**
 * Palette built only from the trusted catalog. Every registered workflow task
 * becomes its own step with typed form fields, so users never edit JSON and
 * a task cannot be combined with another task's input.
 */
export function buildNodeTypes(catalog: EditorCatalog, labels: NodeLabels): PaletteItemOrGroup[] {
  const triggerFields = catalog.events.flatMap((event) => event.fields.map((field) =>
    option(`trigger.${field.name}`, `${event.label} → ${field.label}`)));
  const uniqueTriggerFields = [...new Map(triggerFields.map((item) => [item.value, item])).values()];
  // Enum fields (e.g. membership status) get a value list instead of free text.
  const enumFields = [...new Map(catalog.events.flatMap((event) => event.fields
    .filter((field) => field.options?.length)
    .map((field) => [`trigger.${field.name}`, { path: `trigger.${field.name}`, label: field.label, options: field.options! }] as const))).values()];
  const enumPaths = enumFields.map((field) => field.path);
  // References offered in text fields: trigger fields plus record variables.
  const references = [...new Set(catalog.events.flatMap((event) => [
    ...event.fields.map((field) => `{{trigger.${field.name}}}`),
    ...(event.variables?.fields.map((field) => `{{${event.variables!.namespace}.${field.name}}}`) ?? []),
  ]))];
  const referenceHint = references.length ? `${labels.variablesHint}: ${references.join(" ")}` : "";

  const trigger = {
    type: "trigger",
    icon: NODE_ICONS.trigger,
    label: labels.trigger,
    description: labels.triggerDesc,
    templateType: NodeType.StartNode,
    isStartNode: true,
    schema: {
      type: "object",
      properties: {
        ...nameField(labels),
        triggerType: { type: "string", label: labels.triggerType, options: [option("manual", labels.manual), option("event", labels.event)] },
        eventKey: { type: "string", label: labels.eventKey, options: catalog.events.map((event) => option(event.key, event.label)) },
      },
    },
    uischema: layout(
      control("label", labels.name),
      control("triggerType", labels.triggerType, "Select"),
      control("eventKey", labels.eventKey, "Select", showWhen("triggerType", "event")),
    ),
    defaultPropertiesData: { label: labels.trigger, description: "", triggerType: "event", eventKey: catalog.events[0]?.key ?? "" },
  };

  const tasks = catalog.tasks.map((task) => {
    const visible = task.fields.filter((field) => !field.hidden);
    const properties = Object.fromEntries(task.fields.map((field) => [field.name,
      field.type === "number"
        ? { type: "number", label: field.label }
        : field.type === "boolean"
          ? { type: "boolean", label: field.label }
          : { type: "string", label: field.label, ...(field.options ? { options: field.options } : {}) },
    ]));
    return {
      type: `${TASK_NODE_PREFIX}${task.key}`,
      icon: NODE_ICONS.task,
      label: task.label,
      description: task.description,
      templateType: NodeType.Node,
      schema: { type: "object", properties: { ...nameField(labels), ...properties } },
      uischema: layout(
        control("label", labels.name),
        ...visible.map((field) => control(
          field.name,
          field.required ? `${field.label} *` : field.label,
          field.options ? "Select" : field.multiline ? "TextArea" : field.type === "boolean" ? "Switch" : "Text",
          field.type === "string" && !field.options
            ? { placeholder: [field.help, field.multiline || field.name !== "to" ? referenceHint : ""].filter(Boolean).join(" · ") }
            : field.help ? { placeholder: field.help } : {},
        )),
      ),
      defaultPropertiesData: {
        label: task.label,
        description: "",
        ...Object.fromEntries(task.fields.filter((field) => field.defaultValue !== undefined).map((field) => [field.name, field.defaultValue])),
      },
    };
  });

  const condition = {
    type: "condition",
    icon: NODE_ICONS.condition,
    label: labels.condition,
    description: labels.conditionDesc,
    templateType: NodeType.Node,
    schema: {
      type: "object",
      properties: {
        ...nameField(labels),
        field: { type: "string", label: labels.field, options: [...uniqueTriggerFields, option("custom", labels.customFieldOption)] },
        customField: { type: "string", label: labels.customField },
        operator: { type: "string", label: labels.operator, options: CONDITION_OPERATORS.map((op) => option(op, labels.operators[op])) },
        value: { type: "string", label: labels.value },
        ...Object.fromEntries(enumFields.map((field) => [conditionValueKey(field.path), { type: "string", label: labels.value, options: field.options }])),
      },
    },
    uischema: layout(
      control("label", labels.name),
      control("field", labels.field, "Select"),
      control("customField", labels.customField, "Text", { ...showWhen("field", "custom"), placeholder: labels.customFieldHelp }),
      control("operator", labels.operator, "Select"),
      control("value", labels.value, "Text", {
        placeholder: labels.valueHelp,
        ...(enumPaths.length ? { rule: { effect: "HIDE", condition: { scope: "#/properties/field", schema: { enum: enumPaths } } } } : {}),
      }),
      ...enumFields.map((field) => control(conditionValueKey(field.path), labels.value, "Select", showWhen("field", field.path))),
    ),
    defaultPropertiesData: {
      label: labels.condition,
      description: "",
      field: uniqueTriggerFields[0]?.value ?? "custom",
      customField: "",
      operator: "eq",
      value: "",
      ...Object.fromEntries(enumFields.map((field) => [conditionValueKey(field.path), field.options[0]?.value ?? ""])),
    },
  };

  const delay = {
    type: "delay",
    icon: NODE_ICONS.delay,
    label: labels.delay,
    description: labels.delayDesc,
    templateType: NodeType.Node,
    schema: {
      type: "object",
      properties: {
        ...nameField(labels),
        mode: { type: "string", label: labels.delayMode, options: [option("duration", labels.delayDuration), option("until", labels.delayUntil)] },
        amount: { type: "number", label: labels.amount, minimum: 1 },
        unit: { type: "string", label: labels.unit, options: [option("minutes", labels.minutesUnit), option("hours", labels.hoursUnit), option("days", labels.daysUnit)] },
        until: { type: "string", label: labels.until },
      },
    },
    uischema: layout(
      control("label", labels.name),
      control("mode", labels.delayMode, "Select"),
      control("amount", labels.amount, "Text", { ...showWhen("mode", "duration"), inputType: "number" }),
      control("unit", labels.unit, "Select", showWhen("mode", "duration")),
      control("until", labels.until, "Text", { ...showWhen("mode", "until"), inputType: "datetime-local" }),
    ),
    defaultPropertiesData: { label: labels.delay, description: "", mode: "duration", amount: 1, unit: "days", until: "" },
  };

  const approval = {
    type: "approval",
    icon: NODE_ICONS.approval,
    label: labels.approval,
    description: labels.approvalDesc,
    templateType: NodeType.Node,
    schema: { type: "object", properties: { ...nameField(labels), note: { type: "string", label: labels.note } } },
    uischema: layout(control("label", labels.name), control("note", labels.note, "TextArea")),
    defaultPropertiesData: { label: labels.approval, description: "", note: "" },
  };

  const parallel = {
    type: "parallel",
    icon: NODE_ICONS.parallel,
    label: labels.parallel,
    description: labels.parallelDesc,
    templateType: NodeType.Node,
    schema: { type: "object", properties: nameField(labels) },
    uischema: layout(control("label", labels.name)),
    defaultPropertiesData: { label: labels.parallel, description: "" },
  };

  return [
    { label: labels.groupStart, groupItems: [trigger], isOpen: true },
    { label: labels.groupActions, groupItems: tasks, isOpen: true },
    { label: labels.groupLogic, groupItems: [condition, delay, approval, parallel], isOpen: true },
  ] as unknown as PaletteItemOrGroup[];
}
