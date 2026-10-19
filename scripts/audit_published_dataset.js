/** Validate complete numerical provenance, portable storage, hashes and public membership. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateCoordinateSystem } from './validate_coordinate_system.js';
import { validateStorageEntry, modelStorageId, assertPortablePath } from './model_storage.js';
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const config = await read('config.json');
for (const [mode, cfg] of Object.entries(config.datasets)) {
    if (!cfg.coordinateSystem) continue;
    assert.equal(cfg.storageLayout, 'sha256-v1');
    const database = await read(cfg.output);
    assert.deepEqual(database.metadata.coordinate_system, cfg.coordinateSystem);
    assert.equal(database.metadata.storage_layout, 'sha256-v1');
    assert.equal(database.models.length, cfg.coverage.models);
    assert.equal(new Set(database.models.map(m => m.id)).size, database.models.length);
    const byName = new Map(database.models.map(m => [m.name, m]));
    assert.equal(byName.size, database.models.length);
    const stored = new Map();
    const seen = new Map();
    const base = join(cfg.dnaOut, cfg.dataset);
    for (const entry of await readdir(base, { withFileTypes: true })) {
        assert(entry.isDirectory(), `Unexpected dataset entry: ${entry.name}`);
        const path = join(base, entry.name);
        assert.deepEqual((await readdir(path)).sort(), ['dna.json', 'summary.json']);
        const bytes = await readFile(join(path, 'dna.json'));
        const dna = JSON.parse(bytes);
        const model = validateStorageEntry(entry.name, dna, seen);
        validateCoordinateSystem(dna, cfg.coordinateSystem);
        const summary = await read(join(path, 'summary.json'));
        assert.equal(summary.dna_sha256, createHash('sha256').update(bytes).digest('hex'));
        assert.match(summary.replay_dna_sha256, /^[0-9a-f]{64}$/);
        assert.equal(summary.model_name, model);
        assert.deepEqual(summary.metadata, dna.metadata);
        assert.deepEqual(byName.get(model)?.signature, dna.signature);
        assert(Number.isFinite(byName.get(model)?.x) && Number.isFinite(byName.get(model)?.y));
        stored.set(model, entry.name);
    }
    assert.equal(stored.size, byName.size);
    const manifested = new Set();
    for (const name of await readdir('docs/dna-v101')) {
        if (!name.endsWith('.json')) continue;
        const manifest = await read(join('docs/dna-v101', name));
        if (manifest.mode !== mode) continue;
        assert.deepEqual(manifest.coordinate_system, cfg.coordinateSystem);
        assert.equal(manifest.storage_layout, 'sha256-v1');
        for (const item of manifest.published) {
            assert(!manifested.has(item.model), `Duplicate manifest entry: ${item.model}`);
            manifested.add(item.model);
            assert.equal(item.storage_id, modelStorageId(item.model));
            assert.equal(stored.get(item.model), item.storage_id);
            const prefix = `${cfg.dnaOut.replace(/^\.\//, '')}/${cfg.dataset}/${item.storage_id}`;
            assert.equal(item.dna_path, `${prefix}/dna.json`);
            assert.equal(item.summary_path, `${prefix}/summary.json`);
            assertPortablePath(item.dna_path); assertPortablePath(item.summary_path);
        }
        for (const item of manifest.withheld) assert(!stored.has(item.model), `Withheld model published: ${item.model}`);
    }
    assert.equal(manifested.size, stored.size);
    console.log(`Verified ${mode}: ${stored.size} signatures, complete protocol, hashes, manifests and portable paths.`);
}
