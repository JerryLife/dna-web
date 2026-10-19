/** One-time, idempotent storage/metadata migration; never recomputes signatures or 2D coordinates. */
import { readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { coordinateSystemFromDNA, validateCoordinateSystem } from './validate_coordinate_system.js';
import { modelStorageId, assertPortablePath } from './model_storage.js';
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const write = async (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n');
const config = await read('config.json');
for (const [mode, cfg] of Object.entries(config.datasets)) {
    if (!cfg.coordinateSystem) continue;
    const base = join(cfg.dnaOut, cfg.dataset);
    let expected;
    const published = new Map();
    for (const entry of await readdir(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const directory = join(base, entry.name);
        const dnaFile = existsSync(join(directory, 'dna.json')) ? 'dna.json' : `${entry.name}_dna.json`;
        const summaryFile = existsSync(join(directory, 'summary.json')) ? 'summary.json' : `${entry.name}_summary.json`;
        const dnaBytes = await readFile(join(directory, dnaFile));
        const dna = JSON.parse(dnaBytes);
        const model = dna.metadata.model_name;
        const storageId = modelStorageId(model);
        if (published.has(model)) throw new Error(`Duplicate original ID: ${model}`);
        expected ||= coordinateSystemFromDNA(dna);
        validateCoordinateSystem(dna, expected);
        const summary = await read(join(directory, summaryFile));
        if (summary.dna_sha256 !== createHash('sha256').update(dnaBytes).digest('hex')) throw new Error(`Hash mismatch: ${model}`);
        if (dnaFile !== 'dna.json') await rename(join(directory, dnaFile), join(directory, 'dna.json'));
        if (summaryFile !== 'summary.json') await rename(join(directory, summaryFile), join(directory, 'summary.json'));
        if (entry.name !== storageId) {
            const destination = join(base, storageId);
            if (existsSync(destination)) throw new Error(`Storage collision: ${model}`);
            await rename(directory, destination);
        }
        const dnaPath = `${cfg.dnaOut.replace(/^\.\//, '')}/${cfg.dataset}/${storageId}/dna.json`;
        assertPortablePath(dnaPath);
        published.set(model, { storage_id: storageId, dna_path: dnaPath, summary_path: dnaPath.replace(/dna\.json$/, 'summary.json') });
    }
    cfg.coordinateSystem = expected;
    cfg.storageLayout = 'sha256-v1';
    const database = await read(cfg.output);
    database.metadata.coordinate_system = expected;
    database.metadata.storage_layout = 'sha256-v1';
    await write(cfg.output, database);
    for (const name of await readdir('docs/dna-v101')) {
        if (!name.endsWith('.json')) continue;
        const path = join('docs/dna-v101', name);
        const manifest = await read(path);
        if (manifest.mode !== mode) continue;
        manifest.coordinate_system = expected;
        manifest.storage_layout = 'sha256-v1';
        for (const item of manifest.published) {
            if (!published.has(item.model)) throw new Error(`Manifest entry missing: ${item.model}`);
            Object.assign(item, published.get(item.model));
        }
        await write(path, manifest);
    }
    console.log(`Migrated ${mode}: ${published.size} unchanged signatures.`);
}
await write('config.json', config);
