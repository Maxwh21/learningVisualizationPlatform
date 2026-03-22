'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TreeNode } from '@/lib/api';

interface Props {
  treeId: number;
  topicName: string;
  nodes: TreeNode[];
}

interface Crumb {
  id: number | null;
  title: string;
}

export default function DrillDownFlow({ treeId, topicName, nodes }: Props) {
  const router = useRouter();
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([
    { id: null, title: topicName },
  ]);

  const currentParentId = breadcrumbs[breadcrumbs.length - 1].id;

  const currentNodes = nodes
    .filter((n) => n.parent_node_id === currentParentId)
    .sort((a, b) => a.order_index - b.order_index);

  const hasChildren = (nodeId: number) =>
    nodes.some((n) => n.parent_node_id === nodeId);

  const handleCardClick = (node: TreeNode) => {
    if (hasChildren(node.id)) {
      // Drill into the node to show its children
      setBreadcrumbs((prev) => [...prev, { id: node.id, title: node.title }]);
    } else {
      // Leaf node — go straight to the study page
      router.push(`/tree/${treeId}/node/${node.id}`);
    }
  };

  const handleStudyClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation(); // don't trigger the card's drill-down
    router.push(`/tree/${treeId}/node/${nodeId}`);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs((prev) => prev.slice(0, -1));
    }
  };

  const atRoot = breadcrumbs.length === 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Breadcrumbs */}
      <nav className="flex items-center flex-wrap gap-1 text-sm mb-2">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300 select-none">›</span>}
              {isLast ? (
                <span className="font-semibold text-gray-800">{crumb.title}</span>
              ) : (
                <button
                  onClick={() => handleBreadcrumbClick(i)}
                  className="text-blue-500 hover:text-blue-700 hover:underline"
                >
                  {crumb.title}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      {/* Back button */}
      {!atRoot && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors"
        >
          <span>←</span>
          <span>Back to {breadcrumbs[breadcrumbs.length - 2].title}</span>
        </button>
      )}

      {atRoot && <div className="mb-8" />}

      {/* Node cards */}
      {currentNodes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          No subtopics at this level.
        </p>
      ) : (
        <ol className="relative">
          {/* Vertical spine */}
          <div
            className="absolute left-[19px] top-10 bottom-10 w-px bg-gray-200"
            aria-hidden="true"
          />

          {currentNodes.map((node, index) => {
            const nodeHasChildren = hasChildren(node.id);

            return (
              <li key={node.id} className="relative flex gap-5 mb-5 last:mb-0">

                {/* Step circle */}
                <div
                  className={`
                    relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                    text-sm font-semibold border-2 transition-colors
                    ${nodeHasChildren
                      ? 'bg-white border-blue-200 text-blue-600'
                      : 'bg-white border-gray-200 text-gray-400'
                    }
                  `}
                >
                  {index + 1}
                </div>

                {/* Card */}
                <div
                  onClick={() => handleCardClick(node)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white p-5 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900 leading-snug">
                      {node.title}
                    </h3>
                    {nodeHasChildren && (
                      <span className="text-blue-400 text-base mt-0.5 flex-shrink-0">›</span>
                    )}
                  </div>

                  {node.summary && (
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                      {node.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {nodeHasChildren ? (
                      <span className="text-xs text-blue-400">
                        {nodes.filter((n) => n.parent_node_id === node.id).length} subtopics →
                      </span>
                    ) : (
                      <span />
                    )}

                    {/* Study button — always visible */}
                    <button
                      onClick={(e) => handleStudyClick(e, node.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                    >
                      Study →
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
