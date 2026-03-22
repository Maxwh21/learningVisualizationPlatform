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

export async function sendNodeChat(
  nodeId: number,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${API_URL}/node/${nodeId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  const data = (await res.json()) as { reply: string };
  return data.reply;
}
