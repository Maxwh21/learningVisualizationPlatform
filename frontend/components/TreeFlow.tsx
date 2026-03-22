'use client';

import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TreeNode } from '@/lib/api';

// Custom node rendered inside React Flow
function LearningNode({ data }: { data: { title: string; summary: string } }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        minWidth: '160px',
        maxWidth: '220px',
        fontSize: '13px',
        lineHeight: '1.4',
      }}
    >
      <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
        {data.title}
      </div>
      {data.summary && (
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          {data.summary.length > 100
            ? data.summary.slice(0, 100) + '…'
            : data.summary}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { learning: LearningNode };

// Compute a top-down tree layout.
// Leaf nodes are spaced evenly; parents are centered above their children.
function buildFlowGraph(apiNodes: TreeNode[]): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!apiNodes || apiNodes.length === 0) return { nodes: [], edges: [] };

  // Build a children map: parentId → [childId, ...]
  const childrenMap = new Map<number | null, number[]>();
  const nodeById = new Map<number, TreeNode>();

  apiNodes.forEach((n) => {
    nodeById.set(n.id, n);
    const key = n.parent_node_id;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(n.id);
  });

  // Sort each group by order_index
  childrenMap.forEach((ids) => {
    ids.sort((a, b) => (nodeById.get(a)?.order_index ?? 0) - (nodeById.get(b)?.order_index ?? 0));
  });

  const positions = new Map<number, { x: number; y: number }>();
  let leafCounter = 0;
  const H_GAP = 270;
  const V_GAP = 200;

  function layoutNode(nodeId: number, depth: number): void {
    const children = childrenMap.get(nodeId) ?? [];

    if (children.length === 0) {
      positions.set(nodeId, { x: leafCounter * H_GAP, y: depth * V_GAP });
      leafCounter++;
      return;
    }

    children.forEach((childId) => layoutNode(childId, depth + 1));

    const childXs = children.map((id) => positions.get(id)!.x);
    positions.set(nodeId, {
      x: (Math.min(...childXs) + Math.max(...childXs)) / 2,
      y: depth * V_GAP,
    });
  }

  // Layout from all root nodes
  const roots = childrenMap.get(null) ?? [];
  roots.forEach((rootId) => layoutNode(rootId, 0));

  const nodes: Node[] = apiNodes.map((n) => ({
    id: String(n.id),
    type: 'learning',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: { title: n.title, summary: n.summary },
    style: {
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      background: '#ffffff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
  }));

  const edges: Edge[] = apiNodes
    .filter((n) => n.parent_node_id !== null)
    .map((n) => ({
      id: `e${n.parent_node_id}-${n.id}`,
      source: String(n.parent_node_id),
      target: String(n.id),
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

interface TreeFlowProps {
  nodes: TreeNode[];
}

export default function TreeFlow({ nodes: apiNodes }: TreeFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowGraph(apiNodes),
    // Build once on mount; apiNodes won't change after initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlowGraph(apiNodes);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [apiNodes, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
