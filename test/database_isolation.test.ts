import { it, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
const require = createRequire(import.meta.url);
const runner = fileURLToPath(new URL('./fixtures/database_isolation.ts', import.meta.url));
it('isolates test cleanup from an existing default application database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dna-isolation-'));
    const applicationPath = join(directory, 'server', 'data', 'lab.db');
    const testPath = join(directory, 'isolated', 'test.db');
    const env = { ...process.env };
    delete env.DNA_DATABASE_PATH;
    try {
        // Seed the default-path database in a disposable synthetic checkout.
        execFileSync(process.execPath, ['--import', pathToFileURL(require.resolve('tsx')).href, runner, 'seed', applicationPath], { cwd: directory, env });
        const before = await readFile(applicationPath);
        execFileSync(process.execPath, ['--import', pathToFileURL(require.resolve('tsx')).href, runner, 'exercise', testPath], {
            cwd: directory, env: { ...env, DNA_DATABASE_PATH: testPath }
        });
        expect(await readFile(applicationPath)).toEqual(before);
        const existing = await open({ filename: applicationPath, driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });
        try {
            for (const table of ['votes', 'proposals', 'submission_queue']) {
                expect((await existing.get(`SELECT count(*) AS count FROM ${table}`)).count).toBe(1);
            }
        } finally { await existing.close(); }
    } finally { await rm(directory, { recursive: true, force: true }); }
}, 20000);
