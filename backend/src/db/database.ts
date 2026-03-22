import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), '..', 'database');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'learning.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run immediately on import so tables exist before any prepared statements are compiled
db.exec(`
  CREATE TABLE IF NOT EXISTS trees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tree_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id INTEGER NOT NULL,
    parent_node_id INTEGER NULL,
    title TEXT NOT NULL,
    summary TEXT,
    depth INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES tree_nodes(id) ON DELETE CASCADE
  );
`);

// Add new columns to existing databases without breaking anything.
// SQLite has no IF NOT EXISTS for ALTER TABLE, so we check via PRAGMA first.
function addColumnIfMissing(table: string, column: string, def: string): void {
  const cols = db.pragma(`table_info(${table})`) as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

addColumnIfMissing('tree_nodes', 'learning_goal', 'TEXT');
addColumnIfMissing('tree_nodes', 'why_it_matters', 'TEXT');

console.log('[DB] Database initialized');

export function initializeDatabase(): void {
  // Tables are created on import; this is kept for explicit call compatibility
}
