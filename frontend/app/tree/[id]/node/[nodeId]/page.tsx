'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { getTree, sendNodeChat, ChatMessage, TreeDetail, TreeNode } from '@/lib/api';
import ContentBlocks from '@/components/ContentBlocks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildBreadcrumb(nodes: TreeNode[], nodeId: number): TreeNode[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const path: TreeNode[] = [];
  let cur = map.get(nodeId);
  while (cur) {
    path.unshift(cur);
    cur = cur.parent_node_id !== null ? map.get(cur.parent_node_id) : undefined;
  }
  return path;
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Continue', message: 'Continue.' },
  { label: 'Go deeper', message: 'Go deeper on that.' },
  { label: 'Explain simply', message: 'Can you explain that more simply?' },
  { label: 'Give intuition', message: 'Give me an intuition for why this works.' },
  { label: 'Show example', message: 'Can you show me a concrete example?' },
];

const MANIM_PREFIX = '@MANIM: ';

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser ? (
        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 text-sm bg-blue-600 text-white leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      ) : (
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-100 text-gray-800">
          <div
            className="
              prose prose-sm max-w-none
              prose-p:leading-relaxed prose-p:my-1.5 first:prose-p:mt-0 last:prose-p:mb-0
              prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:mt-3 prose-headings:mb-1
              prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
              prose-li:my-0.5 prose-li:leading-relaxed
              prose-ul:my-1.5 prose-ol:my-1.5
              prose-strong:font-semibold prose-strong:text-gray-900
              prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:text-xs prose-pre:my-2
              prose-pre:prose-code:bg-transparent prose-pre:prose-code:text-gray-100 prose-pre:prose-code:p-0
              prose-blockquote:border-gray-400 prose-blockquote:text-gray-600
            "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NodePage() {
  const params = useParams();
  const router = useRouter();
  const treeId = Number(params.id);
  const nodeId = Number(params.nodeId);

  const [tree, setTree] = useState<TreeDetail | null>(null);
  const [node, setNode] = useState<TreeNode | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<TreeNode[]>([]);
  const [childNodes, setChildNodes] = useState<TreeNode[]>([]);
  const [loadError, setLoadError] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [manimRefreshTrigger, setManimRefreshTrigger] = useState(0);
  const [suggestedNode, setSuggestedNode] = useState<{ id: number; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-resize textarea ───────────────────────────────────────────────────

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  // ── Load tree + node data ──────────────────────────────────────────────────

  useEffect(() => {
    if (isNaN(treeId) || isNaN(nodeId)) {
      setLoadError('Invalid URL parameters');
      return;
    }
    getTree(treeId)
      .then((t) => {
        const found = t.nodes.find((n) => n.id === nodeId);
        if (!found) {
          setLoadError('Node not found in this tree');
          return;
        }
        setTree(t);
        setNode(found);
        setBreadcrumb(buildBreadcrumb(t.nodes, nodeId));
        setChildNodes(
          t.nodes
            .filter((n) => n.parent_node_id === nodeId)
            .sort((a, b) => a.order_index - b.order_index)
        );
      })
      .catch(() => setLoadError('Failed to load tree'));
  }, [treeId, nodeId]);

  // ── Scroll to bottom when messages change ─────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // ── Send message ──────────────────────────────────────────────────────────

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextHistory = [...messages, userMsg];

    setMessages(nextHistory);
    setInput('');
    setIsSending(true);
    setChatError('');

    try {
      const chatReply = await sendNodeChat(nodeId, trimmed, messages);
      setMessages([...nextHistory, { role: 'assistant', content: chatReply.reply }]);
      if (chatReply.manimScript) {
        setManimRefreshTrigger((t) => t + 1);
      }
      if (chatReply.suggestedNode) {
        setSuggestedNode(chatReply.suggestedNode);
      }
    } catch {
      setChatError('Failed to get a response. Please try again.');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <button onClick={() => router.push(`/tree/${treeId}`)} className="text-blue-600 hover:underline text-sm">
            ← Back to tree
          </button>
        </div>
      </div>
    );
  }

  if (!node || !tree) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: '100vh' }}>

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(`/tree/${treeId}`)}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors whitespace-nowrap"
        >
          ← {tree.topic_name}
        </button>
        <span className="text-gray-200 select-none">›</span>
        <span className="text-sm text-gray-700 font-medium truncate">{node.title}</span>
      </div>

      {/* ── Two-column main ── */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden">

        {/* ── LEFT: node context ── */}
        <div className="overflow-y-auto border-r border-gray-200 bg-white px-8 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center flex-wrap gap-1 text-xs text-gray-400 mb-6">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i > 0 && <span className="select-none">›</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-gray-600 font-medium' : ''}>
                  {crumb.title}
                </span>
              </span>
            ))}
          </nav>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
            {node.title}
          </h1>

          {/* Info fields */}
          <div className="space-y-5">
            <InfoRow label="Summary" value={node.summary ?? ''} />
            <InfoRow label="Learning goal" value={node.learning_goal ?? ''} />
            <InfoRow label="Why it matters" value={node.why_it_matters ?? ''} />
          </div>

          {/* Child nodes */}
          {childNodes.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Subtopics
              </p>
              <ul className="space-y-2">
                {childNodes.map((child) => (
                  <li key={child.id}>
                    <button
                      onClick={() => router.push(`/tree/${treeId}/node/${child.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      → {child.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes & scripts */}
          <hr className="mt-8 border-gray-100" />
          <ContentBlocks
            nodeId={nodeId}
            refreshTrigger={manimRefreshTrigger}
            onEdit={(scriptName) => {
              setInput(`@MANIM @FIX:${scriptName} `);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onDiscuss={(scriptName) => {
              setInput(`@MANIM @DISCUSS:${scriptName} `);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          />
        </div>

        {/* ── RIGHT: AI tutor chat ── */}
        <div className="flex flex-col overflow-hidden bg-gray-50">

          {/* Chat header */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">AI Tutor</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Ask anything about <span className="italic">{node.title}</span>
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {isEmpty && (
              <div className="text-center py-10">
                <p className="text-sm text-gray-700 font-medium mb-1">
                  Ready to start learning?
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  The tutor teaches one section at a time. Use <span className="font-medium text-gray-500">Continue</span> to advance and <span className="font-medium text-gray-500">Go deeper</span> to unpack any section further.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => send('Start teaching me this topic.')}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium transition-colors"
                  >
                    Start →
                  </button>
                  {QUICK_ACTIONS.slice(2).map((action) => (
                    <button
                      key={action.label}
                      onClick={() => send(action.message)}
                      className="text-xs bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {chatError && (
            <div className="flex-shrink-0 px-6 py-2 bg-red-50 text-red-500 text-xs border-t border-red-100">
              {chatError}
            </div>
          )}

          {/* Quick actions row (shown after first message) */}
          {!isEmpty && (
            <div className="flex-shrink-0 px-6 pt-3 flex flex-wrap gap-1.5 bg-gray-50">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => send(action.message)}
                  disabled={isSending}
                  className="text-xs bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-500 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
                >
                  {action.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setInput(MANIM_PREFIX);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                disabled={isSending}
                className="text-xs bg-purple-50 border border-purple-200 hover:border-purple-400 hover:text-purple-700 text-purple-600 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 font-medium"
              >
                @MANIM:
              </button>
            </div>
          )}

          {/* Next topic suggestion card */}
          {suggestedNode && (
            <div className="flex-shrink-0 mx-6 mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between gap-3">
              <span className="text-sm text-indigo-700 min-w-0">
                Ready for the next topic? <strong className="truncate">{suggestedNode.title}</strong>
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/tree/${treeId}/node/${suggestedNode.id}`)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
                >
                  Go →
                </button>
                <button
                  onClick={() => setSuggestedNode(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-300 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
                disabled={isSending}
                className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent leading-relaxed overflow-y-auto disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={isSending || !input.trim()}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
