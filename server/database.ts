/**
 * Database Module - SQLite setup for Verify-to-Publish pipeline
 */
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = './server/data/lab.db';

let db: Database | null = null;

type TableColumnInfo = {
    name: string;
};

interface VerifiedSubmissionRow {
    id: number;
    email: string;
    payload: string;
    created_at: string;
}

interface ProposalPayload {
    type: 'proposal';
    modelId: string;
    reason?: string;
    mode?: 'raw' | 'chat';
}

function normalizeMode(mode?: string): 'raw' | 'chat' {
    return mode === 'chat' ? 'chat' : 'raw';
}

async function ensureProposalsModeColumn(database: Database): Promise<void> {
    const columns = await database.all<TableColumnInfo[]>('PRAGMA table_info(proposals)');
    const hasModeColumn = columns.some((col) => col.name === 'mode');

    if (!hasModeColumn) {
        await database.run(`ALTER TABLE proposals ADD COLUMN mode TEXT DEFAULT 'raw'`);
        console.log('🔧 Migrated proposals table: added mode column');
    }

    await database.run(
        `UPDATE proposals
         SET mode = 'raw'
         WHERE mode IS NULL OR trim(mode) = ''`
    );
}

/**
 * Recover submissions that were marked verified but failed to create proposals.
 * This specifically handles the historical "token consumed before INSERT" bug.
 */
async function recoverVerifiedProposalSubmissions(database: Database): Promise<void> {
    const verifiedRows = await database.all<VerifiedSubmissionRow[]>(
        `SELECT id, email, payload, created_at
         FROM submission_queue
         WHERE is_verified = 1`
    );

    let recoveredCount = 0;

    for (const row of verifiedRows) {
        let payload: ProposalPayload | null = null;
        try {
            payload = JSON.parse(row.payload) as ProposalPayload;
        } catch {
            continue;
        }

        if (!payload || payload.type !== 'proposal' || !payload.modelId) {
            continue;
        }

        const modelId = payload.modelId.trim();
        if (!modelId) continue;

        const existingProposal = await database.get<{ id: string }>(
            `SELECT id FROM proposals WHERE lower(model_id) = lower(?)`,
            [modelId]
        );
        if (existingProposal) {
            continue;
        }

        const proposalId = uuidv4();
        const mode = normalizeMode(payload.mode);

        await database.run(
            `INSERT INTO proposals (id, model_id, submitter_email, reason, votes, status, mode, created_at)
             VALUES (?, ?, ?, ?, 1, 'pending', ?, ?)`,
            [proposalId, modelId, row.email, payload.reason || '', mode, row.created_at]
        );

        await database.run(
            `INSERT OR IGNORE INTO votes (proposal_id, user_email, created_at)
             VALUES (?, ?, ?)`,
            [proposalId, row.email, row.created_at]
        );

        recoveredCount += 1;
    }

    if (recoveredCount > 0) {
        console.log(`🔧 Recovered ${recoveredCount} verified proposal(s) stuck before insertion`);
    }
}

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
            mode TEXT DEFAULT 'raw',
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

    // Create subscriptions table (newsletter emails - private)
    await db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            subscribed_at TEXT DEFAULT (datetime('now')),
            is_active INTEGER DEFAULT 1
        )
    `);

    // Migrations for legacy deployments
    await ensureProposalsModeColumn(db);
    await recoverVerifiedProposalSubmissions(db);

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
