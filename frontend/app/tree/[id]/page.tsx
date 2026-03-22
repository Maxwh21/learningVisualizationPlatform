'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTree, deleteTree as apiDeleteTree, TreeDetail } from '@/lib/api';
import DrillDownFlow from '@/components/DrillDownFlow';

export default function TreePage() {
  const params = useParams();
  const router = useRouter();

  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(params.id);
    if (isNaN(id)) {
      setError('Invalid tree ID');
      setLoading(false);
      return;
    }

    getTree(id)
      .then((data) => setTree(data))
      .catch(() => setError('Failed to load tree'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!tree) return;
    if (!confirm(`Delete "${tree.topic_name}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await apiDeleteTree(tree.id);
      router.push('/');
    } catch {
      setError('Failed to delete tree');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading tree…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!tree) return null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← All trees
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Drill-down flow */}
      <DrillDownFlow treeId={tree.id} topicName={tree.topic_name} nodes={tree.nodes} />

    </div>
  );
}
