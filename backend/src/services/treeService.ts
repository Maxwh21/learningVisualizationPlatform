import { db } from '../db/database';
import { generateLearningTree, AiTreeNode } from './openaiService';

export interface DbTree {
  id: number;
  topic_name: string;
  created_at: string;
}

export interface DbTreeNode {
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

export interface TreeWithNodes extends DbTree {
  nodes: DbTreeNode[];
}

const insertTreeStmt = db.prepare(
  'INSERT INTO trees (topic_name) VALUES (?)'
);

const insertNodeStmt = db.prepare(
  'INSERT INTO tree_nodes (tree_id, parent_node_id, title, summary, learning_goal, why_it_matters, depth, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

function insertNodes(
  treeId: number,
  nodes: AiTreeNode[],
  parentId: number | null,
  depth: number
): void {
  nodes.forEach((node, index) => {
    const result = insertNodeStmt.run(
      treeId,
      parentId,
      node.title,
      node.summary || '',
      node.learningGoal || null,
      node.whyItMatters || null,
      depth,
      index
    );
    const nodeId = result.lastInsertRowid as number;
    if (node.children && node.children.length > 0) {
      insertNodes(treeId, node.children, nodeId, depth + 1);
    }
  });
}

export async function createTree(topic: string): Promise<TreeWithNodes> {
  const generated = await generateLearningTree(topic);

  const treeResult = insertTreeStmt.run(generated.topicName || topic);
  const treeId = treeResult.lastInsertRowid as number;

  const insertAll = db.transaction(() => {
    insertNodes(treeId, generated.nodes, null, 0);
  });

  insertAll();

  const tree = getTreeById(treeId);
  if (!tree) throw new Error('Failed to retrieve created tree');
  return tree;
}

export function getAllTrees(): DbTree[] {
  return db
    .prepare('SELECT id, topic_name, created_at FROM trees ORDER BY created_at DESC')
    .all() as DbTree[];
}

export function getTreeById(id: number): TreeWithNodes | null {
  const tree = db
    .prepare('SELECT id, topic_name, created_at FROM trees WHERE id = ?')
    .get(id) as DbTree | undefined;

  if (!tree) return null;

  const nodes = db
    .prepare(
      'SELECT * FROM tree_nodes WHERE tree_id = ? ORDER BY depth ASC, order_index ASC'
    )
    .all(id) as DbTreeNode[];

  return { ...tree, nodes };
}

export function deleteTreeById(id: number): boolean {
  const result = db.prepare('DELETE FROM trees WHERE id = ?').run(id);
  return result.changes > 0;
}
