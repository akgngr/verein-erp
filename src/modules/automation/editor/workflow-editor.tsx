"use client";

import "@workflowbuilder/sdk/style.css";

import {
  useWorkflowBuilderActions,
  WorkflowBuilder,
  type IntegrationDataFormat,
  type WorkflowBuilderEdge,
  type WorkflowBuilderNode,
} from "@workflowbuilder/sdk";
import { useMessages } from "next-intl";
import { useEffect, useMemo, type ReactNode } from "react";

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
    // xyflow renders unknown/missing types as empty boxes: use the SDK templates.
    if (!node.type) node = { ...node, type: node.data?.type === "trigger" ? "start-node" : "node" } as WorkflowBuilderNode;
    const valid = node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y);
    return valid ? node : { ...node, position: { x: (index % 4) * 320, y: Math.floor(index / 4) * 200 } };
  }), [initialDraft.nodes, catalog.tasks]);
  const integration = useMemo(() => ({
    strategy: "props" as const,
    onDataSave: async (data: IntegrationDataFormat) => {
      if (readOnly) return "error" as const;
      return (await onSave(data)) ? "success" as const : "error" as const;
    },
  }), [onSave, readOnly]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <style>{"body{overflow:auto}"}</style>
      <WorkflowBuilder.Root
        name={name}
        nodeTypes={nodeTypes}
        integration={integration}
        initialNodes={initialNodes}
        initialEdges={(initialDraft.edges ?? []) as WorkflowBuilderEdge[]}
        reactFlowProps={REACT_FLOW_PROPS}
      >
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
