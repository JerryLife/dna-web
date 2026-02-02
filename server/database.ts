/**
 * Database Module - SQLite setup for Verify-to-Publish pipeline
 */
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = './server/data/lab.db';

let db: Database | null = null;

/**
 * Initialize the database and create tables if they don't exist
 */
export async function initDatabase(): Promise<Database> {
    if (db) return db;

    // Ensure directory exists
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // Enable WAL mode for better concurrency
    await db.run('PRAGMA journal_mode = WAL');

    // Create submission_queue table
    await db.run(`
        CREATE TABLE IF NOT EXISTS submission_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            payload TEXT NOT NULL,
            verification_token TEXT UNIQUE,
            is_verified INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create index on verification_token for fast lookups
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_verification_token 
        ON submission_queue(verification_token)
    `);

    // Create proposals table (permanent storage)
    await db.run(`
        CREATE TABLE IF NOT EXISTS proposals (
            id TEXT PRIMARY KEY,
            model_id TEXT NOT NULL,
            submitter_email TEXT NOT NULL,
            reason TEXT,
            votes INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create votes table (to prevent duplicates)
    await db.run(`
        CREATE TABLE IF NOT EXISTS votes (
            proposal_id TEXT NOT NULL,
            user_email TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (proposal_id, user_email)
        )
    `);

    console.log('✅ Database initialized');
    return db;
}

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<Database> {
    if (!db) {
        return initDatabase();
    }
    return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.close();
        db = null;
    }
}
