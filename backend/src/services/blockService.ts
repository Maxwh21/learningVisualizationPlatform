import { db } from '../db/database';

export interface Block {
  id: number;
  node_id: number;
  type: 'text' | 'manim';
  content: string;
  order_index: number;
}

export function getBlocks(nodeId: number): Block[] {
  return db
    .prepare('SELECT * FROM node_blocks WHERE node_id = ? ORDER BY order_index ASC, id ASC')
    .all(nodeId) as Block[];
}

export function createBlock(nodeId: number, type: 'text' | 'manim', content: string): Block {
  const maxRow = db
    .prepare('SELECT MAX(order_index) as m FROM node_blocks WHERE node_id = ?')
    .get(nodeId) as { m: number | null };
  const orderIndex = (maxRow.m ?? -1) + 1;

  const result = db
    .prepare('INSERT INTO node_blocks (node_id, type, content, order_index) VALUES (?, ?, ?, ?)')
    .run(nodeId, type, content, orderIndex);

  return db
    .prepare('SELECT * FROM node_blocks WHERE id = ?')
    .get(result.lastInsertRowid) as Block;
}

export function updateBlock(id: number, content: string): void {
  db.prepare('UPDATE node_blocks SET content = ? WHERE id = ?').run(content, id);
}

export function deleteBlock(id: number): Block | undefined {
  const block = db.prepare('SELECT * FROM node_blocks WHERE id = ?').get(id) as Block | undefined;
  if (block) db.prepare('DELETE FROM node_blocks WHERE id = ?').run(id);
  return block;
}

export function deleteManimBlockBySlug(nodeId: number, slug: string): void {
  db.prepare(
    "DELETE FROM node_blocks WHERE node_id = ? AND type = 'manim' AND content = ?"
  ).run(nodeId, slug);
}
