"use client";

import "@xyflow/react/dist/style.css";

import { Background, Controls, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { Clock, GitBranch, Hourglass, ShieldCheck, Split, Zap, Cog } from "lucide-react";
import { useMemo } from "react";

export type PreviewNode = { id: string; kind: string; title: string; summary: string; depth: number; column: number; status?: string };

const ICONS = { trigger: Zap, task: Cog, condition: GitBranch, delay: Clock, approval: ShieldCheck, parallel: Split } as const;

type CardData = { title: string; summary: string; kind: string; status?: string };

function StepCard({ data }: NodeProps<Node<CardData>>) {
  const Icon = ICONS[data.kind as keyof typeof ICONS] ?? Hourglass;
  return (
    <div className="w-72 rounded-large border border-default-200 bg-content1 p-3 shadow-small">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-small font-semibold leading-snug">{data.title}</p>
        <Icon className="h-4 w-4 shrink-0 text-default-500" />
      </div>
      {data.summary ? <p className="mt-1 text-tiny leading-relaxed text-default-600">{data.summary}</p> : null}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { step: StepCard };

/** Read-only overview of the workflow, laid out top-to-bottom by depth. */
export function WorkflowFlowPreview({ nodes, edges, height = 420 }: { nodes: PreviewNode[]; edges: { from: string; to: string }[]; height?: number }) {
  const flow = useMemo(() => {
    const width = new Map<number, number>();
    for (const node of nodes) width.set(node.depth, Math.max(width.get(node.depth) ?? 0, node.column + 1));
    const flowNodes: Node<CardData>[] = nodes.map((node) => ({
      id: node.id,
      type: "step",
      position: { x: (node.column - ((width.get(node.depth) ?? 1) - 1) / 2) * 320, y: node.depth * 150 },
      data: { title: node.title, summary: node.summary, kind: node.kind, status: node.status },
      draggable: false,
      selectable: false,
    }));
    const flowEdges: Edge[] = edges.map((edge) => ({ id: `${edge.from}-${edge.to}`, source: edge.from, target: edge.to, type: "smoothstep" }));
    return { flowNodes, flowEdges };
  }, [nodes, edges]);

  return (
    <div className="overflow-hidden rounded-large border border-default-200 bg-default-50" style={{ height }}>
      <ReactFlow
        nodes={flow.flowNodes}
        edges={flow.flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1, minZoom: 0.75 }}
        minZoom={0.3}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
