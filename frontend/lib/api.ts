const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Tree {
  id: number;
  topic_name: string;
  created_at: string;
}

export interface TreeNode {
  id: number;
  tree_id: number;
  parent_node_id: number | null;
  title: string;
  summary: string;
  learning_goal: string | null;
  why_it_matters: string | null;
  depth: number;
  order_index: number;
}

export interface TreeDetail extends Tree {
  nodes: TreeNode[];
}

export async function listTrees(): Promise<Tree[]> {
  const res = await fetch(`${API_URL}/tree/list`);
  if (!res.ok) throw new Error('Failed to fetch trees');
  return res.json();
}

export async function getTree(id: number): Promise<TreeDetail> {
  const res = await fetch(`${API_URL}/tree/${id}`);
  if (!res.ok) throw new Error('Failed to fetch tree');
  return res.json();
}

export async function createTree(topic: string): Promise<TreeDetail> {
  const res = await fetch(`${API_URL}/tree/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error('Failed to create tree');
  return res.json();
}

export async function deleteTree(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/tree/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete tree');
}

// ─── Node chat ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatReply {
  reply: string;
  manimScript?: string;
  suggestedNode?: { id: number; title: string };
}

export async function sendNodeChat(
  nodeId: number,
  message: string,
  history: ChatMessage[]
): Promise<ChatReply> {
  const res = await fetch(`${API_URL}/node/${nodeId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json() as Promise<ChatReply>;
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export interface Block {
  id: number;
  node_id: number;
  type: 'text' | 'manim';
  content: string;
  order_index: number;
}

export async function getNodeBlocks(nodeId: number): Promise<Block[]> {
  const res = await fetch(`${API_URL}/node/${nodeId}/blocks`);
  if (!res.ok) throw new Error('Failed to fetch blocks');
  return res.json();
}

export async function createNodeBlock(
  nodeId: number,
  type: 'text' | 'manim',
  content: string
): Promise<Block> {
  const res = await fetch(`${API_URL}/node/${nodeId}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content }),
  });
  if (!res.ok) throw new Error('Failed to create block');
  return res.json();
}

export async function updateNodeBlock(
  nodeId: number,
  blockId: number,
  content: string
): Promise<void> {
  const res = await fetch(`${API_URL}/node/${nodeId}/blocks/${blockId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update block');
}

export async function deleteNodeBlock(nodeId: number, blockId: number): Promise<void> {
  const res = await fetch(`${API_URL}/node/${nodeId}/blocks/${blockId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete block');
}

// ─── Manim ────────────────────────────────────────────────────────────────────

export interface ManimScript {
  name: string;
  hasVideo: boolean;
}

export async function listManimScripts(nodeId: number): Promise<ManimScript[]> {
  const res = await fetch(`${API_URL}/node/${nodeId}/manim`);
  if (!res.ok) throw new Error('Failed to list manim scripts');
  return res.json();
}

export async function deleteManimScript(nodeId: number, scriptName: string): Promise<void> {
  const res = await fetch(`${API_URL}/node/${nodeId}/manim/${scriptName}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete manim script');
}

export async function runManimScript(
  nodeId: number,
  scriptName: string
): Promise<{ videoName: string }> {
  const res = await fetch(`${API_URL}/node/${nodeId}/manim/${scriptName}/run`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Render failed');
  }
  return res.json();
}
