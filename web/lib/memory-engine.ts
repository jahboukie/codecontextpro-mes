/**
 * Simplified Memory Engine for Web API
 * Based on the original MemoryEngine but optimized for Next.js API routes
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface SearchResult {
  id: number;
  content: string;
  relevance: number;
  timestamp: string;
  type: string;
  context: string;
  tags: string[];
}

export interface DatabaseMemory {
  id: number;
  content: string;
  context: string;
  type: string;
  tags: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export class WebMemoryEngine {
  private db: Database.Database | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(projectPath: string = process.cwd()) {
    this.dbPath = path.join(projectPath, '.codecontext', 'memory.db');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection
      this.db = new Database(this.dbPath);
      console.log('✅ Connected to SQLite database:', this.dbPath);

      // Create tables
      this.createTables();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Create memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT 'general',
        type TEXT NOT NULL DEFAULT 'general',
        tags TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        context,
        type,
        content='memories',
        content_rowid='id'
      )
    `);

    // Create triggers to keep FTS5 in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, context, type) 
        VALUES (new.id, new.content, new.context, new.type);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, context, type) 
        VALUES('delete', old.id, old.content, old.context, old.type);
      END
    `);

    console.log('✅ Database schema created successfully');
  }

  storeMemory(content: string, context: string = 'api-request', type: string = 'general'): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT INTO memories (content, context, type, tags, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(content, context, type, '[]', '{}');
    return result.lastInsertRowid as number;
  }

  searchMemories(query: string, options: { limit?: number; minRelevance?: number } = {}): SearchResult[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const { limit = 10, minRelevance = 0.1 } = options;

    // Use FTS5 for full-text search
    const stmt = this.db.prepare(`
      SELECT 
        m.id,
        m.content,
        m.context,
        m.type,
        m.tags,
        m.created_at as timestamp,
        rank
      FROM memories_fts 
      JOIN memories m ON memories_fts.rowid = m.id
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(query, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      relevance: 90.9, // Simplified relevance score
      timestamp: row.timestamp,
      type: row.type,
      context: row.context,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  getStats(): { totalMemories: number; totalSizeBytes: number; lastUpdated: string } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM memories');
    const countResult = countStmt.get() as { count: number };

    const lastUpdatedStmt = this.db.prepare('SELECT MAX(updated_at) as last_updated FROM memories');
    const lastUpdatedResult = lastUpdatedStmt.get() as { last_updated: string };

    // Get database file size
    let sizeBytes = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      sizeBytes = stats.size;
    } catch {
      sizeBytes = 0;
    }

    return {
      totalMemories: countResult.count,
      totalSizeBytes: sizeBytes,
      lastUpdated: lastUpdatedResult.last_updated || new Date().toISOString()
    };
  }

  getProjectInfo(): { path: string; dbPath: string } {
    return {
      path: process.cwd(),
      dbPath: this.dbPath
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.initialized = false;
    }
  }
}
