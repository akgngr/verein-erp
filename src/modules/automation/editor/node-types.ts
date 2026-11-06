import { NodeType, type PaletteItemOrGroup } from "@workflowbuilder/sdk";

import { CONDITION_OPERATORS, conditionKeys, CUSTOM_FIELD, CUSTOM_VALUE, TASK_NODE_PREFIX } from "@/shared/automation/workflow-graph";

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
  | "approval" | "approvalDesc" | "note" | "variablesHint" | "customValueOption" | "possibleValues" | "manualValue" | "booleanHelp" | "numberHelp" | "textHelp" | "manualTriggerFieldHelp"
  | "name",
  string
> & { operators: Record<(typeof CONDITION_OPERATORS)[number], string> };

const option = (value: string, label: string) => ({ value, label });
const control = (scope: string, label: string, type = "Text", extra: Record<string, unknown> = {}) =>
  ({ type, scope: `#/properties/${scope}`, label, ...extra });
const showWhen = (scope: string, value: string) => ({
  rule: { effect: "SHOW", condition: { scope: `#/properties/${scope}`, schema: { const: value } } },
});
const layout = (...elements: unknown[]) => ({ type: "VerticalLayout", elements: elements.flat() });

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/**
 * A control followed by its help text shown below the field (not as a
 * placeholder). The help shares the control's visibility rule.
 */
const withHelp = (element: Record<string, unknown>, help: string | undefined): unknown[] => {
  if (!help) return [element];
  // RichText ignores rules, so group control + help in a layout carrying the rule.
  const { rule, ...control } = element;
  return [{
    type: "VerticalLayout",
    elements: [control, { type: "RichText", text: escapeHtml(help) }],
    ...(rule ? { rule } : {}),
  }];
};
const nameField = (labels: NodeLabels) => ({ label: { type: "string", label: labels.name }, description: { type: "string", label: "" } });

/**
 * Palette built only from the trusted catalog. Every registered workflow task
 * becomes its own step with typed form fields, so users never edit JSON and
 * a task cannot be combined with another task's input.
 */
export function buildNodeTypes(catalog: EditorCatalog, labels: NodeLabels): PaletteItemOrGroup[] {
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
        ...visible.map((field) => withHelp(
          control(
            field.name,
            field.required ? `${field.label} *` : field.label,
            field.options ? "Select" : field.multiline ? "TextArea" : field.type === "boolean" ? "Switch" : "Text",
          ),
          field.type === "string" && !field.options
            ? [field.help, field.multiline || field.name !== "to" ? referenceHint : ""].filter(Boolean).join(" · ")
            : field.help,
        )),
      ),
      defaultPropertiesData: {
        label: task.label,
        description: "",
        ...Object.fromEntries(task.fields.filter((field) => field.defaultValue !== undefined).map((field) => [field.name, field.defaultValue])),
      },
    };
  });

  // Trigger-aware condition: the editor keeps `triggerEvent` in sync with the
  // workflow's trigger, so only that event's fields (and their values) show.
  const condProps: Record<string, unknown> = {
    ...nameField(labels),
    triggerEvent: { type: "string", label: "" },
    customField: { type: "string", label: labels.customField },
    operator: { type: "string", label: labels.operator, options: CONDITION_OPERATORS.map((op) => option(op, labels.operators[op])) },
    value: { type: "string", label: labels.value },
  };
  const condControls: unknown[] = [control("label", labels.name)];
  const condDefaults: Record<string, unknown> = { label: labels.condition, description: "", triggerEvent: "", customField: "", operator: "eq", value: "" };
  const fieldHelp = (field: EditorCatalog["events"][number]["fields"][number]) => {
    const base = field.help || (field.type === "number" ? labels.numberHelp : field.type === "boolean" ? labels.booleanHelp : labels.textHelp);
    // For list fields typed manually, show the stored codes next to their labels.
    const codes = field.options?.map((item) => `${item.value} (${item.label})`).join(", ");
    return codes ? `${base} — ${labels.possibleValues}: ${codes}` : base;
  };
  const whenTrigger = (eventKey: string) => ({ scope: "#/properties/triggerEvent", schema: { const: eventKey } });
  const whenField = (eventKey: string, field: string) => ({ scope: `#/properties/${conditionKeys.field(eventKey)}`, schema: { const: field } });
  const showAll = (...conditions: unknown[]) => ({ rule: { effect: "SHOW", condition: { type: "AND", conditions } } });

  for (const event of catalog.events) {
    const fieldKey = conditionKeys.field(event.key);
    condProps[fieldKey] = {
      type: "string",
      label: labels.field,
      options: [...event.fields.map((field) => option(field.name, field.label)), option(CUSTOM_FIELD, labels.customFieldOption)],
    };
    condControls.push(control(fieldKey, labels.field, "Select", { rule: { effect: "SHOW", condition: whenTrigger(event.key) } }));
    const preferred = event.fields.find((field) => field.options?.length) ?? event.fields[0];
    condDefaults[fieldKey] = preferred?.name ?? CUSTOM_FIELD;

    for (const field of event.fields) {
      const textKey = conditionKeys.text(event.key, field.name);
      condProps[textKey] = { type: "string", label: labels.manualValue };
      if (field.options?.length) {
        const valueKey = conditionKeys.value(event.key, field.name);
        condProps[valueKey] = { type: "string", label: labels.value, options: [...field.options, option(CUSTOM_VALUE, labels.customValueOption)] };
        condDefaults[valueKey] = field.options[0]?.value ?? "";
        condControls.push(control(valueKey, labels.value, "Select", showAll(whenTrigger(event.key), whenField(event.key, field.name))));
        condControls.push(...withHelp(control(textKey, labels.manualValue, "Text", {
          ...showAll(whenTrigger(event.key), whenField(event.key, field.name), { scope: `#/properties/${valueKey}`, schema: { const: CUSTOM_VALUE } }),
        }), fieldHelp(field)));
      } else {
        condControls.push(...withHelp(control(textKey, labels.value, "Text", {
          ...showAll(whenTrigger(event.key), whenField(event.key, field.name)),
        }), fieldHelp(field)));
      }
    }
  }

  // Manual trigger or "other field": free field path + value with guidance.
  const eventKeys = catalog.events.map((event) => event.key);
  const customVisible = {
    rule: {
      effect: "SHOW",
      condition: {
        type: "OR",
        conditions: [
          { scope: "#/properties/triggerEvent", schema: { not: { enum: eventKeys } } },
          ...catalog.events.map((event) => ({ type: "AND", conditions: [whenTrigger(event.key), whenField(event.key, CUSTOM_FIELD)] })),
        ],
      },
    },
  };
  condControls.push(...withHelp(control("customField", labels.customField, "Text", customVisible), labels.manualTriggerFieldHelp));
  condControls.push(control("operator", labels.operator, "Select"));
  condControls.push(...withHelp(control("value", labels.value, "Text", customVisible), labels.valueHelp));

  const condition = {
    type: "condition",
    icon: NODE_ICONS.condition,
    label: labels.condition,
    description: labels.conditionDesc,
    templateType: NodeType.Node,
    schema: { type: "object", properties: condProps },
    uischema: layout(...condControls),
    defaultPropertiesData: condDefaults,
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
