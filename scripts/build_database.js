/**
 * Build DNA Database Script
 * Aggregates DNA data from dna-out/ into public/dna_database.json
 * Supports building both raw and chat DNA databases
 * 
 * Usage: 
 *   node scripts/build_database.js          # Build both
 *   node scripts/build_database.js raw      # Build raw only
 *   node scripts/build_database.js chat     # Build chat only
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import config from '../config.json' with { type: 'json' };

// Get build mode from command line
const MODE = process.argv[2] || 'all'; // 'raw', 'chat', or 'all'
const DEFAULT_PROJECTION_METHOD = 'pca';
const SUPPORTED_PROJECTION_METHODS = new Set(['pca', 'random']);

function resolveProjectionMethod(datasetConfig) {
    const requested = String(
        datasetConfig?.projectionMethod ??
        config.projection?.method ??
        DEFAULT_PROJECTION_METHOD
    ).toLowerCase();

    if (!SUPPORTED_PROJECTION_METHODS.has(requested)) {
        console.warn(
            `Unknown projection method "${requested}", falling back to "${DEFAULT_PROJECTION_METHOD}".`
        );
        return DEFAULT_PROJECTION_METHOD;
    }

    return requested;
}

async function buildDatabase(mode, datasetConfig) {
    console.log(`\n🧬 Building ${mode.toUpperCase()} DNA Database...`);

    const models = [];
    const errors = [];

    try {
        // Ensure public directory exists
        if (!existsSync('./public')) {
            await mkdir('./public', { recursive: true });
        }

        // Determine the path to scan
        let scanPath;
        if (datasetConfig.dataset) {
            // Has a dataset subfolder (e.g., dna-out/rand)
            scanPath = join(datasetConfig.dnaOut, datasetConfig.dataset);
        } else {
            // Flat structure (e.g., dna-chat-out-rand with direct model folders)
            scanPath = datasetConfig.dnaOut;
        }

        if (!existsSync(scanPath)) {
            console.error(`Dataset directory not found: ${scanPath}`);
            console.log(`Skipping ${mode} database...`);
            return null;
        }

        const modelDirs = await readdir(scanPath, { withFileTypes: true });
        console.log(`Found ${modelDirs.length} entries in ${scanPath}`);

        // Process each model
        for (const dir of modelDirs) {
            if (!dir.isDirectory()) continue;
            if (dir.name.startsWith('_') || dir.name.startsWith('.')) continue;

            const modelId = dir.name;
            const modelPath = join(scanPath, modelId);

            try {
                // Find DNA file
                const dnaFile = join(modelPath, `${modelId}_dna.json`);
                const summaryFile = join(modelPath, `${modelId}_summary.json`);

                if (!existsSync(dnaFile)) {
                    errors.push(`No DNA file for ${modelId}`);
                    continue;
                }

                // Read DNA
                const dnaData = JSON.parse(await readFile(dnaFile, 'utf-8'));

                // Read summary if exists
                let summaryData = {};
                if (existsSync(summaryFile)) {
                    summaryData = JSON.parse(await readFile(summaryFile, 'utf-8'));
                }

                // Parse model info
                const parsed = parseModelId(modelId);

                // Create model entry
                const modelEntry = {
                    id: modelId,
                    name: parsed.fullName,
                    organization: parsed.organization,
                    family: parsed.family,
                    parameters: parsed.parameters,
                    isInstruct: parsed.isInstruct,
                    signature: dnaData.signature,
                    x: 0, // Will be updated with t-SNE
                    y: 0,
                    metadata: {
                        dna_dimension: dnaData.metadata?.dna_dimension || 128,
                        extraction_time: dnaData.metadata?.extraction_time,
                        probe_count: dnaData.metadata?.probe_count
                    }
                };

                models.push(modelEntry);
                process.stdout.write(`\r✓ Processed ${models.length} models...`);

            } catch (err) {
                errors.push(`Error processing ${modelId}: ${err.message}`);
            }
        }

        console.log(`\n✓ Processed ${models.length} models`);

        if (errors.length > 0) {
            console.log(`\n⚠ ${errors.length} errors:`);
            errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
            if (errors.length > 5) console.log(`  ... and ${errors.length - 5} more`);
        }

        if (models.length === 0) {
            console.log(`No models found for ${mode}. Skipping...`);
            return null;
        }

        // Generate 2D coordinates
        const projectionMethod = resolveProjectionMethod(datasetConfig);
        console.log(`\n📊 Generating 2D projections (${projectionMethod})...`);
        generate2DCoordinates(models, projectionMethod);

        // Write output
        const database = {
            models,
            metadata: {
                version: '1.0.0',
                total_models: models.length,
                last_updated: new Date().toISOString().split('T')[0],
                mode: mode,
                dataset: datasetConfig.dataset || 'flat',
                projection_method: projectionMethod,
                dna_dimension: 128
            }
        };

        await writeFile(datasetConfig.output, JSON.stringify(database, null, 2));
        console.log(`✓ Database written to ${datasetConfig.output}`);
        console.log(`  Total models: ${models.length}`);
        console.log(`  File size: ${(JSON.stringify(database).length / 1024).toFixed(1)} KB`);

        return database;

    } catch (err) {
        console.error(`Fatal error building ${mode}:`, err);
        return null;
    }
}

function parseModelId(modelId) {
    // Format: "Organization_ModelName" from directory name
    const parts = modelId.split('_');
    const organization = parts[0] || 'Unknown';
    const modelName = parts.slice(1).join('-') || modelId;

    // Extract family
    const familyMatch = modelName.match(/^([A-Za-z]+)/);
    const family = familyMatch ? familyMatch[1] : organization;

    // Extract parameters
    const paramMatch = modelName.match(/(\d+\.?\d*)[Bb]/);
    const parameters = paramMatch ? paramMatch[1] + 'B' : null;

    // Check if instruct-tuned
    const isInstruct = /instruct|chat|it$/i.test(modelName);

    return {
        organization,
        modelName,
        family,
        parameters,
        isInstruct,
        fullName: modelId.replace('_', '/')
    };
}

function createSeededRandom(seed = 42) {
    return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function assignScaledCoordinates(models, projected, rand) {
    if (projected.length === 0) {
        models.forEach(model => {
            model.x = (rand() - 0.5) * 100;
            model.y = (rand() - 0.5) * 100;
        });
        return;
    }

    const xs = projected.map(p => p.x);
    const ys = projected.map(p => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    let sigIndex = 0;
    models.forEach(model => {
        if (!model.signature) {
            model.x = (rand() - 0.5) * 100;
            model.y = (rand() - 0.5) * 100;
            return;
        }

        const p = projected[sigIndex++];
        model.x = ((p.x - xMin) / xRange - 0.5) * 100;
        model.y = ((p.y - yMin) / yRange - 0.5) * 100;
        model.x += (rand() - 0.5) * 1;
        model.y += (rand() - 0.5) * 1;
    });
}

function generate2DCoordinatesRandom(models) {
    if (models.length === 0) return;

    const rand = createSeededRandom(42);
    const signatures = models.map(m => m.signature).filter(Boolean);
    if (signatures.length === 0) {
        assignScaledCoordinates(models, [], rand);
        return;
    }

    const dim = signatures[0].length;
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const normalize = (v) => {
        const norm = Math.sqrt(dot(v, v));
        return norm > 1e-10 ? v.map(x => x / norm) : v;
    };

    const randVec = (size) => normalize(Array.from({ length: size }, () => rand() * 2 - 1));
    const proj1 = randVec(dim);
    let proj2 = randVec(dim);
    // Orthogonalize second projection vector for a cleaner spread.
    const proj = dot(proj2, proj1);
    proj2 = normalize(proj2.map((v, i) => v - proj * proj1[i]));

    console.log('  Computing random projection...');
    const projected = signatures.map(sig => ({
        x: dot(sig, proj1),
        y: dot(sig, proj2),
    }));

    assignScaledCoordinates(models, projected, rand);

    console.log('  Random projection complete.');
}

function generate2DCoordinatesPCA(models) {
    if (models.length === 0) return;

    const rand = createSeededRandom(42);
    const signatures = models.map(m => m.signature).filter(Boolean);
    if (signatures.length < 2) {
        assignScaledCoordinates(models, [], rand);
        return;
    }

    const n = signatures.length;
    const dim = signatures[0].length;
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const normalize = (v) => {
        const norm = Math.sqrt(dot(v, v));
        return norm > 1e-10 ? v.map(x => x / norm) : v;
    };

    const mean = Array(dim).fill(0);
    for (const sig of signatures) {
        for (let i = 0; i < dim; i++) {
            mean[i] += sig[i] / n;
        }
    }
    const centered = signatures.map(sig => sig.map((v, i) => v - mean[i]));

    const randomUnitVector = () => normalize(Array.from({ length: dim }, () => rand() * 2 - 1));

    const powerIteration = (excludeVector = null, maxIter = 120) => {
        let v = randomUnitVector();

        for (let iter = 0; iter < maxIter; iter++) {
            const Xv = centered.map(row => dot(row, v));
            const XtXv = Array(dim).fill(0);

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < dim; j++) {
                    XtXv[j] += centered[i][j] * Xv[i];
                }
            }

            if (excludeVector) {
                const proj = dot(XtXv, excludeVector);
                for (let j = 0; j < dim; j++) {
                    XtXv[j] -= proj * excludeVector[j];
                }
            }

            v = normalize(XtXv);
        }

        return v;
    };

    console.log('  Computing PCA projection...');
    const pc1 = powerIteration(null);
    let pc2 = powerIteration(pc1);

    // If second component collapses numerically, derive a fallback orthogonal vector.
    if (Math.sqrt(dot(pc2, pc2)) < 1e-8) {
        let fallback = randomUnitVector();
        const proj = dot(fallback, pc1);
        fallback = fallback.map((v, i) => v - proj * pc1[i]);
        pc2 = normalize(fallback);
    }

    const projected = centered.map(sig => ({
        x: dot(sig, pc1),
        y: dot(sig, pc2),
    }));

    assignScaledCoordinates(models, projected, rand);
    console.log('  PCA projection complete.');
}

function generate2DCoordinates(models, method = DEFAULT_PROJECTION_METHOD) {
    if (method === 'random') {
        generate2DCoordinatesRandom(models);
        return;
    }

    generate2DCoordinatesPCA(models);
}

async function main() {
    console.log('='.repeat(50));
    console.log('LLM DNA Database Builder');
    console.log('='.repeat(50));

    const results = {};

    if (MODE === 'all' || MODE === 'raw') {
        if (config.datasets?.raw) {
            results.raw = await buildDatabase('raw', config.datasets.raw);
        } else {
            // Fallback to legacy config
            results.raw = await buildDatabase('raw', {
                dnaOut: config.paths.dnaOut,
                dataset: config.dataset,
                output: config.paths.output
            });
        }
    }

    if (MODE === 'all' || MODE === 'chat') {
        if (config.datasets?.chat) {
            results.chat = await buildDatabase('chat', config.datasets.chat);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Build Summary:');
    console.log('='.repeat(50));

    if (results.raw) {
        console.log(`✓ Raw DNA: ${results.raw.metadata.total_models} models`);
    } else if (MODE === 'all' || MODE === 'raw') {
        console.log('✗ Raw DNA: No models or skipped');
    }

    if (results.chat) {
        console.log(`✓ Chat DNA: ${results.chat.metadata.total_models} models`);
    } else if (MODE === 'all' || MODE === 'chat') {
        console.log('✗ Chat DNA: No models or skipped');
    }

    console.log('');
}

// Run
main();
