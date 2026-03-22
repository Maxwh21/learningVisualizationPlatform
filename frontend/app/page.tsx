'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listTrees, createTree, Tree } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');

  const fetchTrees = async () => {
    try {
      const data = await listTrees();
      setTrees(data);
    } catch {
      setError('Failed to load trees. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrees();
  }, []);

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    setError('');
    try {
      const newTree = await createTree(topic.trim());
      setTopic('');
      setShowInput(false);
      router.push(`/tree/${newTree.id}`);
    } catch {
      setError('Failed to create tree. Check your API key and try again.');
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') {
      setShowInput(false);
      setTopic('');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Learning Trees</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Generate AI-powered visual learning maps for any topic
            </p>
          </div>
          <button
            onClick={() => setShowInput(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + New Tree
          </button>
        </div>

        {/* New tree input */}
        {showInput && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
            <p className="text-sm text-gray-600 mb-3 font-medium">
              Enter a topic to generate a learning tree:
            </p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Statistical Mechanics, Machine Learning, Ancient Rome..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                disabled={creating}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !topic.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? 'Generating…' : 'Generate'}
              </button>
              <button
                onClick={() => { setShowInput(false); setTopic(''); }}
                disabled={creating}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {creating && (
              <p className="text-xs text-gray-400 mt-3">
                Generating your learning tree with AI… this may take 10–20 seconds.
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-5 text-sm">
            {error}
          </div>
        )}

        {/* Tree list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading trees…</div>
        ) : trees.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-1">No learning trees yet</p>
            <p className="text-gray-400 text-sm">
              Click &quot;+ New Tree&quot; to generate your first one
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {trees.map((tree) => (
              <div
                key={tree.id}
                onClick={() => router.push(`/tree/${tree.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
              >
                <h3 className="font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {tree.topic_name}
                </h3>
                <p className="text-xs text-gray-400">
                  {new Date(tree.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
