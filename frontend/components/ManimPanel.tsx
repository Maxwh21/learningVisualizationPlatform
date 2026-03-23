'use client';

import { useEffect, useState } from 'react';
import {
  ManimScript,
  listManimScripts,
  deleteManimScript,
  runManimScript,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  nodeId: number;
  refreshTrigger: number;
  onEdit: (scriptName: string) => void;
  onDiscuss: (scriptName: string) => void;
}

export default function ManimPanel({ nodeId, refreshTrigger, onEdit, onDiscuss }: Props) {
  const [scripts, setScripts] = useState<ManimScript[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [deletingName, setDeletingName] = useState<string | null>(null);

  async function fetchScripts() {
    try {
      const data = await listManimScripts(nodeId);
      setScripts(data);
    } catch {
      // silently ignore — panel just stays empty
    }
  }

  useEffect(() => {
    fetchScripts();
  }, [nodeId, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(name: string) {
    setDeletingName(name);
    try {
      await deleteManimScript(nodeId, name);
      if (selected === name) setSelected(null);
      await fetchScripts();
    } catch {
      // ignore
    } finally {
      setDeletingName(null);
    }
  }

  async function handleRun(name: string) {
    setIsRunning(true);
    setRunError('');
    try {
      await runManimScript(nodeId, name);
      await fetchScripts();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Render failed');
    } finally {
      setIsRunning(false);
    }
  }

  function handleSelect(name: string) {
    setSelected((prev) => (prev === name ? null : name));
    setRunError('');
  }

  const selectedScript = scripts.find((s) => s.name === selected);

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Manim Scripts
      </p>

      {scripts.length === 0 ? (
        <p className="text-xs text-gray-500 italic">
          No scripts yet. Ask the tutor to create one with @MANIM:
        </p>
      ) : (
        <ul className="space-y-1">
          {scripts.map((script) => (
            <li key={script.name}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSelect(script.name)}
                  className={`flex-1 text-left text-sm px-2 py-1 rounded transition-colors ${
                    selected === script.name
                      ? 'bg-indigo-100 text-indigo-800 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1 text-gray-400">{script.hasVideo ? '▶' : '📄'}</span>
                  {script.name}
                </button>
                <button
                  onClick={() => onDiscuss(script.name)}
                  className="text-gray-400 hover:text-blue-500 transition-colors px-1 text-xs shrink-0"
                  title="Discuss script"
                >
                  💬
                </button>
                <button
                  onClick={() => onEdit(script.name)}
                  className="text-gray-400 hover:text-indigo-500 transition-colors px-1 text-xs shrink-0"
                  title="Edit script"
                >
                  ✏
                </button>
                <button
                  onClick={() => handleDelete(script.name)}
                  disabled={deletingName === script.name}
                  className="text-gray-400 hover:text-red-500 transition-colors px-1 text-xs shrink-0"
                  title="Delete script"
                >
                  {deletingName === script.name ? '…' : '✕'}
                </button>
              </div>

              {selected === script.name && (
                <div className="mt-2 ml-2">
                  {script.hasVideo ? (
                    <>
                      <video
                        key={script.name}
                        src={`${API_URL}/manim/node_${nodeId}/${script.name}.mp4`}
                        controls
                        autoPlay
                        className="w-full rounded border border-gray-200"
                      />
                      <button
                        onClick={() => handleDelete(script.name)}
                        disabled={deletingName === script.name}
                        className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        {deletingName === script.name ? 'Deleting…' : 'Delete script'}
                      </button>
                    </>
                  ) : (
                    <div>
                      <button
                        onClick={() => handleRun(script.name)}
                        disabled={isRunning}
                        className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {isRunning ? (
                          <>
                            <span className="animate-spin">⟳</span>
                            Rendering…
                          </>
                        ) : (
                          '▶ Run script'
                        )}
                      </button>
                      {runError && (
                        <p className="mt-1 text-xs text-red-600">{runError}</p>
                      )}
                      <button
                        onClick={() => handleDelete(script.name)}
                        disabled={deletingName === script.name}
                        className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors block"
                      >
                        {deletingName === script.name ? 'Deleting…' : 'Delete script'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
