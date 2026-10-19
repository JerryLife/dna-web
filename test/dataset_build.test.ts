import { it, expect } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, symlink, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
// @ts-expect-error JavaScript build helper.
import { modelStorageId } from '../scripts/model_storage.js';
it('builds portable IDs without losing model names and refuses to overwrite output on incompatible input', async () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const directory = await mkdtemp(join(tmpdir(), 'dna-builder-'));
    try {
        await mkdir(join(directory, 'scripts'));
        await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'junction');
        await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
        for (const name of ['build_database.js', 'validate_coordinate_system.js', 'model_storage.js', 'legacy_storage_aliases.json']) {
            await copyFile(join(root, 'scripts', name), join(directory, 'scripts', name));
        }
        const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
        const current = config.datasets.chat;
        const sourceRoot = join(root, current.dnaOut, current.dataset);
        const source = JSON.parse(await readFile(join(sourceRoot, (await readdir(sourceRoot))[0], 'dna.json'), 'utf8'));
        const names = ['org/model:free', 'org/model_free'];
        for (let i = 0; i < names.length; i++) {
            const dna = structuredClone(source);
            dna.metadata.model_name = names[i];
            dna.signature = Array.from({ length: 128 }, (_, j) => (i + 1) * (j + 1));
            const path = join(directory, 'dna-v101', 'chat', 'rand_chinese', modelStorageId(names[i]));
            await mkdir(path, { recursive: true });
            await writeFile(join(path, 'dna.json'), JSON.stringify(dna));
        }
        await writeFile(join(directory, 'config.json'), JSON.stringify({
            datasets: { chat: { ...current, coverage: { models: 2 }, projectionMethod: 'pca' } }
        }));
        const args = [join(directory, 'scripts', 'build_database.js'), 'chat'];
        execFileSync(process.execPath, args, { cwd: directory, stdio: 'pipe' });
        const outputPath = join(directory, 'public', 'dna_database_chat.json');
        const before = await readFile(outputPath);
        const output = JSON.parse(before.toString());
        expect(output.models.map((m: any) => m.name).sort()).toEqual(names.sort());
        expect(new Set(output.models.map((m: any) => m.id)).size).toBe(2);
        expect(output.models.every((m: any) => Number.isFinite(m.x) && Number.isFinite(m.y))).toBe(true);
        expect(output.metadata.storage_layout).toBe('sha256-v1');
        expect(output.metadata.coordinate_system).toEqual(current.coordinateSystem);
        const badPath = join(directory, 'dna-v101', 'chat', 'rand_chinese', modelStorageId(names[0]), 'dna.json');
        const bad = JSON.parse(await readFile(badPath, 'utf8'));
        bad.metadata.extractor_config.final_dna_normalization = 'l2';
        await writeFile(badPath, JSON.stringify(bad));
        expect(() => execFileSync(process.execPath, args, { cwd: directory, stdio: 'pipe' })).toThrow();
        expect(await readFile(outputPath)).toEqual(before);
    } finally { await rm(directory, { recursive: true, force: true }); }
}, 20000);
