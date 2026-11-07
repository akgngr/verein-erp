"use client";

import "@workflowbuilder/sdk/style.css";

import {
  useStore,
  useWorkflowBuilderActions,
  WorkflowBuilder,
  type IntegrationDataFormat,
  type WorkflowBuilderEdge,
  type WorkflowBuilderNode,
} from "@workflowbuilder/sdk";
import { useMessages } from "next-intl";
import { useEffect, useMemo, type ReactNode } from "react";

import { conditionKeys, conditionValueKey, CUSTOM_FIELD, CUSTOM_VALUE } from "@/shared/automation/workflow-graph";

import { buildNodeTypes, NODE_ICONS, type EditorCatalogProps, type NodeLabels } from "./node-types";
import { applyEditorLocale } from "./sdk-i18n";

export type EditorToolbarProps = { save: () => Promise<unknown> };

export type WorkflowEditorProps = {
  name: string;
  locale: string;
  initialDraft: { nodes?: unknown[]; edges?: unknown[] };
  catalog: EditorCatalogProps;
  labels: NodeLabels;
  readOnly: boolean;
  onSave: (draft: IntegrationDataFormat) => Promise<boolean>;
  /** Our own toolbar (rendered inside the SDK root so it can trigger save). */
  toolbar: (props: EditorToolbarProps) => ReactNode;
};

type AnyNode = { id: string; data?: { type?: string; properties?: Record<string, unknown> } };

function triggerEventOf(nodes: readonly AnyNode[]): string {
  const props = nodes.find((node) => node.data?.type === "trigger")?.data?.properties ?? {};
  return props.triggerType === "event" && typeof props.eventKey === "string" ? props.eventKey : "";
}

/**
 * Keeps every condition node's hidden `triggerEvent` equal to the workflow
 * trigger's event, so the condition form shows only that event's fields.
 */
function TriggerSync() {
  useEffect(() => {
    const sync = () => {
      const state = useStore.getState();
      const eventKey = triggerEventOf(state.nodes as AnyNode[]);
      for (const node of state.nodes as AnyNode[]) {
        const props = node.data?.properties;
        if (node.data?.type === "condition" && props && props.triggerEvent !== eventKey) {
          state.setNodeProperties(node.id, { ...props, triggerEvent: eventKey });
        }
      }
    };
    sync();
    return useStore.subscribe(sync);
  }, []);
  return null;
}

function migrateCondition(node: WorkflowBuilderNode, eventKey: string, catalog: EditorCatalogProps): WorkflowBuilderNode {
  const props = (node.data.properties ?? {}) as Record<string, unknown>;
  if (!eventKey || props[conditionKeys.field(eventKey)] !== undefined) return node;
  const legacy = typeof props.field === "string" ? props.field : "";
  const event = catalog.events.find((item) => item.key === eventKey);
  const name = legacy.startsWith("trigger.") ? legacy.slice("trigger.".length) : "";
  const field = event?.fields.find((item) => item.name === name);
  const next: Record<string, unknown> = { ...props, triggerEvent: eventKey };
  if (!field) {
    if (legacy && legacy !== CUSTOM_FIELD) next.customField = legacy;
    next[conditionKeys.field(eventKey)] = CUSTOM_FIELD;
  } else {
    const legacyValue = String(props[conditionValueKey(legacy)] ?? props.value ?? "");
    next[conditionKeys.field(eventKey)] = field.name;
    if (field.options?.some((option) => option.value === legacyValue)) {
      next[conditionKeys.value(eventKey, field.name)] = legacyValue;
    } else if (field.options?.length) {
      next[conditionKeys.value(eventKey, field.name)] = CUSTOM_VALUE;
      next[conditionKeys.text(eventKey, field.name)] = legacyValue;
    } else {
      next[conditionKeys.text(eventKey, field.name)] = legacyValue;
    }
  }
  return { ...node, data: { ...node.data, properties: next } } as WorkflowBuilderNode;
}

const REACT_FLOW_PROPS = { fitView: true, fitViewOptions: { padding: 0.3, maxZoom: 1 } };

function Toolbar({ render, openLabels }: { render: WorkflowEditorProps["toolbar"]; openLabels: string[] }) {
  const actions = useWorkflowBuilderActions();
  // The SDK palette and properties panel start collapsed in custom layouts and
  // do not open on selection; open both once on mount.
  const key = openLabels.join("|");
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const label of key.split("|").filter(Boolean)) {
        document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)?.click();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [key]);
  return <>{render({ save: actions.save })}</>;
}

/**
 * Workflow Builder SDK used as an editor only, with our own header instead of
 * the SDK app bar. Saves go through an authenticated server action ("props"
 * strategy); nothing is stored in localStorage.
 */
export default function WorkflowEditor({ name, locale, initialDraft, catalog, labels, readOnly, onSave, toolbar }: WorkflowEditorProps) {
  const messages = useMessages() as { automation?: { workflows?: { sdk?: Record<string, unknown> } } };
  const sdkBundle = messages.automation?.workflows?.sdk;
  useEffect(() => applyEditorLocale(locale, sdkBundle ?? {}), [locale, sdkBundle]);
  const nodeTypes = useMemo(() => buildNodeTypes(catalog, labels), [catalog, labels]);
  const triggerEvent = triggerEventOf((initialDraft.nodes ?? []) as AnyNode[]);
  const defaultsByType = useMemo(() => new Map(
    (nodeTypes as unknown as { groupItems?: { type: string; defaultPropertiesData?: Record<string, unknown> }[] }[])
      .flatMap((group) => group.groupItems ?? [])
      .map((item) => [item.type, Object.fromEntries(Object.entries(item.defaultPropertiesData ?? {}).filter(([key]) => key !== "label" && key !== "description"))] as const),
  ), [nodeTypes]);
  const initialNodes = useMemo(() => (initialDraft.nodes ?? []).map((raw, index) => {
    let node = raw as WorkflowBuilderNode;
    // Legacy generic "task" node (taskKey + JSON input) → per-task node with form fields.
    if (node.data?.type === "task") {
      const props = (node.data.properties ?? {}) as Record<string, unknown>;
      let input: Record<string, unknown> = {};
      try {
        input = typeof props.input === "string" && props.input.trim() ? JSON.parse(props.input) as Record<string, unknown> : {};
      } catch {
        input = {};
      }
      const task = catalog.tasks.find((item) => item.key === props.taskKey);
      const known = Object.fromEntries(Object.entries(input).filter(([key]) => task?.fields.some((field) => field.name === key)));
      node = {
        ...node,
        data: { ...node.data, type: `task.${String(props.taskKey ?? "")}`, icon: NODE_ICONS.task, properties: { label: props.label ?? task?.label ?? "", description: "", ...known } },
      } as WorkflowBuilderNode;
    }
    if (node.data && !node.data.icon) {
      const kind = node.data.type.startsWith("task.") ? "task" : node.data.type;
      node = { ...node, data: { ...node.data, icon: NODE_ICONS[kind] ?? "Gear" } } as WorkflowBuilderNode;
    }
    // Legacy condition (single "field" select) → trigger-aware keys.
    if (node.data?.type === "condition") node = migrateCondition(node, triggerEvent, catalog);
    // Yeni eklenen alanların (ör. sonradan gelen modül olayları) varsayılanları eski adımlarda eksik olabilir:
    // eksik/boş olanlar palet varsayılanıyla doldurulur, girilmiş değerlere dokunulmaz.
    const defaults = defaultsByType.get(String(node.data?.type ?? ""));
    if (defaults && node.data) {
      const props = (node.data.properties ?? {}) as Record<string, unknown>;
      const missing = Object.fromEntries(Object.entries(defaults).filter(([key]) => props[key] === undefined || props[key] === null || props[key] === ""));
      if (Object.keys(missing).length) node = { ...node, data: { ...node.data, properties: { ...props, ...missing } } } as WorkflowBuilderNode;
    }
    // xyflow renders unknown/missing types as empty boxes: use the SDK templates.
    if (!node.type) node = { ...node, type: node.data?.type === "trigger" ? "start-node" : "node" } as WorkflowBuilderNode;
    const valid = node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y);
    return valid ? node : { ...node, position: { x: (index % 4) * 320, y: Math.floor(index / 4) * 200 } };
  }), [initialDraft.nodes, catalog, triggerEvent, defaultsByType]);
  const integration = useMemo(() => ({
    strategy: "props" as const,
    onDataSave: async (data: IntegrationDataFormat) => {
      if (readOnly) return "error" as const;
      return (await onSave(data)) ? "success" as const : "error" as const;
    },
  }), [onSave, readOnly]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkflowBuilder.Root
        name={name}
        nodeTypes={nodeTypes}
        integration={integration}
        initialNodes={initialNodes}
        initialEdges={(initialDraft.edges ?? []) as WorkflowBuilderEdge[]}
        reactFlowProps={REACT_FLOW_PROPS}
      >
        <TriggerSync />
        <Toolbar
          render={toolbar}
          openLabels={[
            (sdkBundle?.tooltips as { openPalette?: string } | undefined)?.openPalette ?? "",
            (sdkBundle?.tooltips as { openPropertiesBar?: string } | undefined)?.openPropertiesBar ?? "",
          ]}
        />
        {/* SDK panels float over the canvas; the container only provides the size. */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0">
            <WorkflowBuilder.Canvas />
          </div>
          <div className="pointer-events-none absolute inset-y-3 start-3 z-10 flex w-72 flex-col [&>*]:pointer-events-auto">
            <WorkflowBuilder.Palette />
          </div>
          <div className="pointer-events-none absolute inset-y-3 end-3 z-10 flex w-96 flex-col items-stretch [&>*]:pointer-events-auto">
            <WorkflowBuilder.PropertiesPanel />
          </div>
        </div>
      </WorkflowBuilder.Root>
    </div>
  );
}
