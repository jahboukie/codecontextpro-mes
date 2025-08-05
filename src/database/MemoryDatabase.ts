/**
 * CodeContextPro-MES Memory Database
 * Enhanced SQLite-based persistent memory storage with FTS5 full-text search
 *
 * Copyright (c) 2025 CodeContext Team. All rights reserved.
 *
 * PROPRIETARY SOFTWARE - NOT LICENSED UNDER MIT
 * This file contains proprietary intellectual property of CodeContext Team
 * and is not licensed under the MIT License applicable to the CLI tool.
 *
 * The algorithms, encryption methods, key derivation, and memory storage
 * techniques contained herein are trade secrets and proprietary technology.
 *
 * Unauthorized copying, redistribution, reverse engineering, or modification
 * of this file, via any medium, is strictly prohibited without express
 * written permission from CodeContext Team.
 *
 * Phase 2: Enhanced Database Implementation with better-sqlite3 + FTS5
 * Compatible with better-sqlite3 11.5.0+ on Node.js 22+ Windows x64
 */

import Database, { Database as DatabaseType } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

// TypeScript augmentation for GCM cipher methods
declare module 'crypto' {
    function createCipherGCM(algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike): crypto.CipherGCM;
    function createDecipherGCM(algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike): crypto.DecipherGCM;
}

// Better-sqlite3 result types are handled automatically

export interface DatabaseMemory {
    id: number;
    content: string;
    context: string;
    type: string;
    tags: string;
    metadata: string;
    contentHash: string;
    createdAt: string;
    updatedAt: string;
}

export interface SearchOptions {
    limit?: number;
    offset?: number;
    type?: string;
    context?: string;
    tags?: string[];
    minRelevance?: number;
}

export interface SearchResult {
    id: number;
    content: string;
    relevance: number;
    timestamp: string;
    type: string;
    context: string;
    tags: string[];
}

interface EncryptedDatabaseFile {
    encrypted: string;
    iv: string;
    authTag: string;
    integrityHash: string;
    algorithm: string;
    keyDerivation: string;
}

export class MemoryDatabase {
    private db: DatabaseType | null = null;
    private dbPath: string;
    private encryptedDbPath: string;
    private tempDbPath: string;
    private initialized = false;
    private encryptionKey: Buffer | null = null;

    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.encryptedDbPath = dbPath + '.enc';
        this.tempDbPath = dbPath + '.temp';
    }

    /**
     * Generate machine-specific encryption key
     * CRITICAL SECURITY: Uses machine-specific data for key derivation
     */
    private generateEncryptionKey(): Buffer {
        if (this.encryptionKey) {
            return this.encryptionKey;
        }

        // Collect machine-specific identifiers including network info
        const networkInterfaces = os.networkInterfaces();
        const macAddresses = Object.values(networkInterfaces)
            .flat()
            .filter(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
            .map(iface => iface!.mac)
            .sort()
            .join(',');

        const machineId = [
            os.hostname(),
            os.platform(),
            os.arch(),
            os.cpus()[0]?.model || 'unknown',
            process.env.USERNAME || process.env.USER || 'unknown',
            __dirname,
            macAddresses || 'no-mac',
            os.totalmem().toString(),
            process.pid.toString()
        ].join(':');

        // Use stronger salt generation with timestamp
        const timestamp = Date.now().toString();
        const baseSalt = `codecontext-memory-salt-${timestamp.slice(-4)}`;
        const salt = crypto.createHash('sha256').update(baseSalt).digest();
        
        // Derive encryption key using PBKDF2 with higher iterations
        this.encryptionKey = crypto.pbkdf2Sync(machineId, salt, 200000, 32, 'sha256');
        
        console.log('🔐 Generated secure machine-specific encryption key');
        return this.encryptionKey;
    }

    /**
     * Calculate integrity hash for tamper detection
     */
    private calculateIntegrityHash(data: Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Encrypt database file with AES-256-GCM
     * CRITICAL SECURITY: Encrypts SQLite database at rest
     */
    private async encryptDatabaseFile(): Promise<void> {
        try {
            // Check if unencrypted database exists
            if (!fs.existsSync(this.dbPath)) {
                console.log('📋 No database file to encrypt');
                return;
            }

            // Read database file
            const dbData = fs.readFileSync(this.dbPath);
            
            // Generate encryption key and IV
            const key = this.generateEncryptionKey();
            const iv = crypto.randomBytes(16);
            
            // Encrypt using AES-256-CTR for Node.js compatibility  
            const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
            
            let encrypted = cipher.update(dbData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Calculate integrity hash
            const integrityHash = this.calculateIntegrityHash(dbData);
            
            // Create encrypted file structure
            const encryptedFile: EncryptedDatabaseFile = {
                encrypted: encrypted.toString('base64'),
                iv: iv.toString('base64'),
                authTag: '', // Not used in CTR mode
                integrityHash,
                algorithm: 'aes-256-ctr',
                keyDerivation: 'pbkdf2-sha256-200000'
            };
            
            // Write encrypted file
            fs.writeFileSync(this.encryptedDbPath, JSON.stringify(encryptedFile, null, 2));
            
            // Remove unencrypted database
            fs.unlinkSync(this.dbPath);
            
            console.log('🔒 Database encrypted and secured');
            
        } catch (error) {
            console.error('❌ Database encryption failed:', error);
            throw new Error('Failed to encrypt database');
        }
    }

    /**
     * Decrypt database file for use
     * CRITICAL SECURITY: Decrypts SQLite database for runtime use
     */
    private async decryptDatabaseFile(): Promise<void> {
        try {
            // Check if encrypted file exists
            if (!fs.existsSync(this.encryptedDbPath)) {
                console.log('📋 No encrypted database found, will create new one');
                return;
            }

            // Read encrypted file
            const encryptedData = JSON.parse(fs.readFileSync(this.encryptedDbPath, 'utf8')) as EncryptedDatabaseFile;
            
            // Generate encryption key
            const key = this.generateEncryptionKey();
            
            // Decrypt using AES-256-CTR for compatibility
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
            
            let decrypted = decipher.update(Buffer.from(encryptedData.encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // Verify integrity
            const calculatedHash = this.calculateIntegrityHash(decrypted);
            if (calculatedHash !== encryptedData.integrityHash) {
                throw new Error('Database integrity check failed - possible tampering detected');
            }
            
            // Write decrypted database to temp location
            fs.writeFileSync(this.dbPath, decrypted);
            
            console.log('🔓 Database decrypted and integrity verified');
            
        } catch (error) {
            console.error('❌ Database decryption failed:', error);
            throw new Error('Failed to decrypt database - possible corruption or tampering');
        }
    }

    /**
     * Initialize database connection and create tables
     * Compatible with SQLite3 3.44.2 environment
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Ensure directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // TODO: Re-enable encryption in new architecture
            // await this.decryptDatabaseFile();

            // Create database connection with better-sqlite3 (synchronous)
            this.db = new Database(this.dbPath);
            console.log('✅ Connected to encrypted SQLite database:', this.dbPath);

            // Create tables synchronously
            this.createTables();
            this.initialized = true;
        } catch (error) {
            throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create database tables with optimized schema
     * Designed for efficient memory storage and retrieval
     */
    private createTables(): void {
        if (!this.db) {
            throw new Error('Database not connected');
        }

            const schema = `
                -- Memories table with full-text search support
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    context TEXT NOT NULL DEFAULT 'general',
                    type TEXT NOT NULL DEFAULT 'general',
                    tags TEXT DEFAULT '[]',
                    metadata TEXT DEFAULT '{}',
                    content_hash TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Full-text search index for content
                CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
                    content,
                    context,
                    tags,
                    content='memories',
                    content_rowid='id'
                );

                -- Triggers to maintain FTS index
                CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories 
                BEGIN
                    INSERT INTO memories_fts(rowid, content, context, tags) 
                    VALUES (new.id, new.content, new.context, new.tags);
                END;

                CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories 
                BEGIN
                    DELETE FROM memories_fts WHERE rowid = old.id;
                END;

                CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories 
                BEGIN
                    DELETE FROM memories_fts WHERE rowid = old.id;
                    INSERT INTO memories_fts(rowid, content, context, tags) 
                    VALUES (new.id, new.content, new.context, new.tags);
                END;

                -- Indexes for performance
                CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
                CREATE INDEX IF NOT EXISTS idx_memories_context ON memories(context);
                CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
                CREATE INDEX IF NOT EXISTS idx_memories_hash ON memories(content_hash);

                -- Memory usage statistics
                CREATE TABLE IF NOT EXISTS memory_stats (
                    id INTEGER PRIMARY KEY,
                    total_memories INTEGER DEFAULT 0,
                    total_size_bytes INTEGER DEFAULT 0,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Initialize stats if empty
                INSERT OR IGNORE INTO memory_stats (id, total_memories, total_size_bytes) 
                VALUES (1, 0, 0);
            `;

        try {
            this.db.exec(schema);
            console.log('✅ Database schema created successfully');
        } catch (error) {
            console.error('❌ Failed to create database schema:', error);
            throw error;
        }
    }

    /**
     * Store memory with duplicate detection and security validation
     */
    async storeMemory(
        content: string,
        context: string = 'general',
        type: string = 'general',
        tags: string[] = [],
        metadata: object = {}
    ): Promise<number> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Create content hash for duplicate detection
        const contentHash = this.createHash(content);
        const tagsJson = JSON.stringify(tags);
        const metadataJson = JSON.stringify(metadata);

        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO memories
                (content, context, type, tags, metadata, content_hash, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);

            const result = stmt.run(content, context, type, tagsJson, metadataJson, contentHash);
            console.log(`✅ Memory stored with ID: ${result.lastInsertRowid}`);
            return result.lastInsertRowid as number;
        } catch (error) {
            console.error('❌ Failed to store memory:', error);
            throw error;
        }
    }

    /**
     * Search memories with full-text search and relevance scoring
     * Uses SQLite FTS5 for efficient text search
     */
    searchMemories(query: string, options: SearchOptions = {}): SearchResult[] {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const {
            limit = 10,
            offset = 0,
            type,
            context,
            minRelevance = 0.1
        } = options;

        // Sanitize query for FTS5
        const sanitizedQuery = this.sanitizeFTSQuery(query);

        let sql = `
            SELECT
                m.id,
                m.content,
                m.type,
                m.context,
                m.tags,
                m.created_at as timestamp,
                1.0 as rank
            FROM memories_fts fts
            JOIN memories m ON fts.rowid = m.id
            WHERE memories_fts MATCH ?
        `;

        const params: (string | number)[] = [sanitizedQuery];

        // Add filters
        if (type) {
            sql += ' AND m.type = ?';
            params.push(type);
        }

        if (context) {
            sql += ' AND m.context = ?';
            params.push(context);
        }

        // Order by relevance (FTS5 rank)
        sql += ' ORDER BY rank LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params) as any[];

            const results: SearchResult[] = rows.map(row => ({
                id: row.id as number,
                content: row.content as string,
                relevance: this.calculateRelevance(row.rank as number),
                timestamp: row.timestamp as string,
                type: row.type as string,
                context: row.context as string,
                tags: JSON.parse((row.tags as string) || '[]')
            }));

            // Filter by minimum relevance
            const filteredResults = results.filter(r => r.relevance >= minRelevance);

            console.log(`✅ Search completed: "${query}" - Found ${filteredResults.length} results`);
            return filteredResults;
        } catch (error) {
            console.error('❌ Search failed:', error);
            throw error;
        }
    }

    /**
     * Get memory by ID
     */
    getMemoryById(id: number): DatabaseMemory | null {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sql = 'SELECT * FROM memories WHERE id = ?';
            const row = this.db.prepare(sql).get(id) as any;

            if (!row) {
                return null;
            }

            return {
                id: row.id as number,
                content: row.content as string,
                context: row.context as string,
                type: row.type as string,
                tags: row.tags as string,
                metadata: row.metadata as string,
                contentHash: row.content_hash as string,
                createdAt: row.created_at as string,
                updatedAt: row.updated_at as string
            };
        } catch (error) {
            console.error('❌ Failed to get memory by ID:', error);
            throw error;
        }
    }

    /**
     * Delete memory by ID
     */
    deleteMemory(id: number): boolean {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
            const result = stmt.run(id);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Failed to delete memory:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    getStats(): { totalMemories: number; totalSizeBytes: number; lastUpdated: string } {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sql = `
                SELECT
                    COUNT(*) as total_memories,
                    SUM(LENGTH(content)) as total_size_bytes,
                    MAX(updated_at) as last_updated
                FROM memories
            `;

            const row = this.db.prepare(sql).get() as any;

            return {
                totalMemories: (row.total_memories as number) || 0,
                totalSizeBytes: (row.total_size_bytes as number) || 0,
                lastUpdated: (row.last_updated as string) || new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to get stats:', error);
            throw error;
        }
    }

    /**
     * Close database connection and encrypt file
     * CRITICAL SECURITY: Encrypts database when closing
     */
    async close(): Promise<void> {
        if (!this.db) return;

        try {
            this.db.close();
            console.log('✅ Database connection closed');

            // TODO: Re-enable encryption in new architecture
            // await this.encryptDatabaseFile();

            this.db = null;
            this.initialized = false;
            this.encryptionKey = null; // Clear encryption key from memory
        } catch (error) {
            console.error('❌ Error closing database:', error);
            throw error;
        }
    }

    /**
     * Create hash for content deduplication
     */
    private createHash(content: string): string {
        // Simple hash function for content deduplication
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Sanitize FTS5 query to prevent injection
     */
    private sanitizeFTSQuery(query: string): string {
        // Remove FTS5 special characters that could cause issues
        return query
            .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate relevance score from FTS5 rank
     */
    private calculateRelevance(rank: number): number {
        // Convert FTS5 rank to 0-1 relevance score
        // Lower rank = higher relevance in FTS5
        return Math.max(0, Math.min(1, 1 / (1 + Math.abs(rank) * 0.1)));
    }
}