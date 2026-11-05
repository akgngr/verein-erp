"use client";

import "@workflowbuilder/sdk/style.css";

import {
  WorkflowBuilder,
  type IntegrationDataFormat,
  type WorkflowBuilderEdge,
  type WorkflowBuilderNode,
} from "@workflowbuilder/sdk";
import { useMemo } from "react";

import { buildNodeTypes, NODE_ICONS, type EditorCatalogProps, type NodeLabels } from "./node-types";

export type WorkflowEditorProps = {
  name: string;
  initialDraft: { nodes?: unknown[]; edges?: unknown[] };
  catalog: EditorCatalogProps;
  labels: NodeLabels;
  readOnly: boolean;
  onSave: (draft: IntegrationDataFormat) => Promise<boolean>;
};

/**
 * Workflow Builder SDK as an editor only. Persistence uses the "props"
 * strategy: every save goes through an authenticated server action; nothing
 * is stored in localStorage and the SDK's own API persistence is not used.
 */
export default function WorkflowEditor({ name, initialDraft, catalog, labels, readOnly, onSave }: WorkflowEditorProps) {
  const nodeTypes = useMemo(() => buildNodeTypes(catalog, labels), [catalog, labels]);
  // Drafts saved by the editor always carry positions; imported/legacy drafts
  // may not. Lay those out on a simple grid instead of crashing the canvas.
  const initialNodes = useMemo(() => (initialDraft.nodes ?? []).map((raw, index) => {
    let node = raw as WorkflowBuilderNode;
    if (node.data && !node.data.icon) {
      node = { ...node, data: { ...node.data, icon: NODE_ICONS[node.data.type] ?? "Gear" } } as WorkflowBuilderNode;
    }
    const valid = node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y);
    return valid ? node : { ...node, type: node.type ?? "node", position: { x: (index % 4) * 320, y: Math.floor(index / 4) * 200 } };
  }), [initialDraft.nodes]);
  const integration = useMemo(() => ({
    strategy: "props" as const,
    onDataSave: async (data: IntegrationDataFormat) => {
      if (readOnly) return "error" as const;
      return (await onSave(data)) ? "success" as const : "error" as const;
    },
  }), [onSave, readOnly]);

  return (
    <div className="relative h-[72vh] min-h-[520px] overflow-hidden rounded-large border border-default-200">
      {/* The SDK resets body overflow for full-screen use; keep the ERP page scrollable. */}
      <style>{"body{overflow:auto}"}</style>
      <WorkflowBuilder.Root
        name={name}
        nodeTypes={nodeTypes}
        integration={integration}
        initialNodes={initialNodes}
        initialEdges={(initialDraft.edges ?? []) as WorkflowBuilderEdge[]}
      />
    </div>
  );
}
