'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Block,
  getNodeBlocks,
  createNodeBlock,
  updateNodeBlock,
  deleteNodeBlock,
  runManimScript,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  nodeId: number;
  refreshTrigger: number;
  onEdit: (scriptName: string) => void;
  onDiscuss: (scriptName: string) => void;
}

// ─── Text block ───────────────────────────────────────────────────────────────

function TextBlock({
  block,
  nodeId,
  onDelete,
}: {
  block: Block;
  nodeId: number;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(block.content);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
  }, [value]);

  // Focus empty new blocks immediately
  useEffect(() => {
    if (!block.content) taRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBlur() {
    if (value === block.content) return;
    setSaving(true);
    try {
      await updateNodeBlock(nodeId, block.id, value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group relative">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Type a note…"
        rows={1}
        className="w-full resize-none text-sm text-gray-700 placeholder-gray-300 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300 focus:bg-white transition-colors leading-relaxed overflow-hidden"
      />
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {saving && <span className="text-xs text-gray-400">saving…</span>}
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors text-xs px-1"
          title="Delete note"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Manim block ──────────────────────────────────────────────────────────────

function ManimBlock({
  block,
  nodeId,
  onEdit,
  onDiscuss,
  onDelete,
}: {
  block: Block;
  nodeId: number;
  onEdit: (name: string) => void;
  onDiscuss: (name: string) => void;
  onDelete: () => void;
}) {
  const scriptName = block.content;
  const [expanded, setExpanded] = useState(false);
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');

  // Check if video exists on mount and when expanded
  useEffect(() => {
    checkVideo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkVideo() {
    try {
      const res = await fetch(
        `${API_URL}/manim/node_${nodeId}/${scriptName}.mp4`,
        { method: 'HEAD' }
      );
      setHasVideo(res.ok);
    } catch {
      setHasVideo(false);
    }
  }

  async function handleRun() {
    setIsRunning(true);
    setRunError('');
    try {
      await runManimScript(nodeId, scriptName);
      setHasVideo(true);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Render failed');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 text-left text-sm text-gray-700 font-medium flex items-center gap-1.5 min-w-0"
        >
          <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
          <span className="text-gray-400 text-xs">{hasVideo ? '▶' : '📄'}</span>
          <span className="truncate">{scriptName}</span>
        </button>
        <button
          onClick={() => onDiscuss(scriptName)}
          className="text-gray-400 hover:text-blue-500 transition-colors px-1 text-xs shrink-0"
          title="Discuss"
        >💬</button>
        <button
          onClick={() => onEdit(scriptName)}
          className="text-gray-400 hover:text-indigo-500 transition-colors px-1 text-xs shrink-0"
          title="Edit script"
        >✏</button>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 transition-colors px-1 text-xs shrink-0"
          title="Delete"
        >✕</button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 bg-white">
          {hasVideo === null ? (
            <p className="text-xs text-gray-400">Checking…</p>
          ) : hasVideo ? (
            <>
              <video
                key={scriptName}
                src={`${API_URL}/manim/node_${nodeId}/${scriptName}.mp4`}
                controls
                autoPlay
                className="w-full rounded border border-gray-200"
              />
              <button
                onClick={onDelete}
                className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Delete script
              </button>
            </>
          ) : (
            <div>
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isRunning ? (
                  <><span className="animate-spin">⟳</span>Rendering…</>
                ) : (
                  '▶ Run script'
                )}
              </button>
              {runError && <p className="mt-1 text-xs text-red-600">{runError}</p>}
              <button
                onClick={onDelete}
                className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors block"
              >
                Delete script
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContentBlocks({ nodeId, refreshTrigger, onEdit, onDiscuss }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  async function fetchBlocks() {
    try {
      setBlocks(await getNodeBlocks(nodeId));
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    fetchBlocks();
  }, [nodeId, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddNote() {
    try {
      const block = await createNodeBlock(nodeId, 'text', '');
      setBlocks((prev) => [...prev, block]);
    } catch {
      // ignore
    }
  }

  async function handleDelete(blockId: number) {
    try {
      await deleteNodeBlock(nodeId, blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Notes &amp; Scripts
      </p>

      <div className="space-y-2">
        {blocks.map((block) =>
          block.type === 'text' ? (
            <TextBlock
              key={block.id}
              block={block}
              nodeId={nodeId}
              onDelete={() => handleDelete(block.id)}
            />
          ) : (
            <ManimBlock
              key={block.id}
              block={block}
              nodeId={nodeId}
              onEdit={onEdit}
              onDiscuss={onDiscuss}
              onDelete={() => handleDelete(block.id)}
            />
          )
        )}
      </div>

      <button
        onClick={handleAddNote}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
      >
        <span>+</span> Add note
      </button>
    </div>
  );
}
