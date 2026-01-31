/**
 * Build DNA Database Script
 * Aggregates DNA data from dna-out/ into public/dna_database.json
 * 
 * Usage: node scripts/build_database.js
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import config from '../config.js';

const DNA_OUT_DIR = config.paths.dnaOut;
const OUTPUT_FILE = config.paths.output;
const DATASET = config.dataset;

async function buildDatabase() {
    console.log('🧬 Building DNA Database...\n');

    const models = [];
    const errors = [];

    try {
        // Ensure public directory exists
        if (!existsSync('./public')) {
            await mkdir('./public', { recursive: true });
        }

        // Read dataset directory
        const datasetPath = join(DNA_OUT_DIR, DATASET);

        if (!existsSync(datasetPath)) {
            console.error(`Dataset directory not found: ${datasetPath}`);
            console.log('Creating sample database with placeholder data...');
            await createSampleDatabase();
            return;
        }

        const modelDirs = await readdir(datasetPath, { withFileTypes: true });

        console.log(`Found ${modelDirs.length} model directories in ${DATASET}/\n`);

        // Process each model
        for (const dir of modelDirs) {
            if (!dir.isDirectory()) continue;
            if (dir.name.startsWith('_') || dir.name.startsWith('.')) continue;

            const modelId = dir.name;
            const modelPath = join(datasetPath, modelId);

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

        console.log(`\n\n✓ Processed ${models.length} models`);

        if (errors.length > 0) {
            console.log(`\n⚠ ${errors.length} errors:`);
            errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
            if (errors.length > 5) console.log(`  ... and ${errors.length - 5} more`);
        }

        // Generate 2D coordinates using simple projection
        // (In production, you'd use proper t-SNE)
        console.log('\n📊 Generating 2D projections...');
        generate2DCoordinates(models);

        // Write output
        const database = {
            models,
            metadata: {
                version: '1.0.0',
                total_models: models.length,
                last_updated: new Date().toISOString().split('T')[0],
                dataset: DATASET,
                dna_dimension: 128
            }
        };

        await writeFile(OUTPUT_FILE, JSON.stringify(database, null, 2));
        console.log(`\n✓ Database written to ${OUTPUT_FILE}`);
        console.log(`  Total size: ${(JSON.stringify(database).length / 1024).toFixed(1)} KB`);

    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
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

function generate2DCoordinates(models) {
    // Simple PCA-like projection for demo
    // In production, use proper t-SNE library

    if (models.length === 0) return;

    const signatures = models.map(m => m.signature).filter(Boolean);
    if (signatures.length === 0) return;

    const dim = signatures[0].length;

    // Use first two principal components (simplified)
    // Just project onto random but consistent axes
    const axis1 = Array(dim).fill(0).map((_, i) => Math.sin(i * 0.1));
    const axis2 = Array(dim).fill(0).map((_, i) => Math.cos(i * 0.1));

    // Normalize axes
    const norm1 = Math.sqrt(axis1.reduce((s, v) => s + v * v, 0));
    const norm2 = Math.sqrt(axis2.reduce((s, v) => s + v * v, 0));

    models.forEach(model => {
        if (!model.signature) {
            model.x = (Math.random() - 0.5) * 100;
            model.y = (Math.random() - 0.5) * 100;
            return;
        }

        // Project onto axes
        model.x = model.signature.reduce((s, v, i) => s + v * axis1[i], 0) / norm1 * 50;
        model.y = model.signature.reduce((s, v, i) => s + v * axis2[i], 0) / norm2 * 50;

        // Add small jitter to prevent overlap
        model.x += (Math.random() - 0.5) * 2;
        model.y += (Math.random() - 0.5) * 2;
    });
}

async function createSampleDatabase() {
    // Create sample database with demo models
    const sampleModels = [
        { id: 'Qwen_Qwen2.5-7B-Instruct', family: 'Qwen', org: 'Qwen', params: '7B', instruct: true },
        { id: 'Qwen_Qwen2.5-14B-Instruct', family: 'Qwen', org: 'Qwen', params: '14B', instruct: true },
        { id: 'Qwen_Qwen2.5-72B-Instruct', family: 'Qwen', org: 'Qwen', params: '72B', instruct: true },
        { id: 'meta-llama_Llama-3.1-8B-Instruct', family: 'Llama', org: 'Meta', params: '8B', instruct: true },
        { id: 'meta-llama_Llama-3.1-70B-Instruct', family: 'Llama', org: 'Meta', params: '70B', instruct: true },
        { id: 'mistralai_Mistral-7B-Instruct-v0.3', family: 'Mistral', org: 'Mistral', params: '7B', instruct: true },
        { id: 'google_gemma-2-9b-it', family: 'Gemma', org: 'Google', params: '9B', instruct: true },
        { id: 'microsoft_Phi-3-mini-128k-instruct', family: 'Phi', org: 'Microsoft', params: '3.8B', instruct: true },
    ];

    const models = sampleModels.map((m, i) => ({
        id: m.id,
        name: m.id.replace('_', '/'),
        organization: m.org,
        family: m.family,
        parameters: m.params,
        isInstruct: m.instruct,
        signature: Array(128).fill(0).map(() => (Math.random() - 0.5) * 0.5),
        x: (i % 3 - 1) * 30 + (Math.random() - 0.5) * 10,
        y: Math.floor(i / 3) * 30 - 30 + (Math.random() - 0.5) * 10,
        metadata: { dna_dimension: 128, probe_count: 100 }
    }));

    const database = {
        models,
        metadata: {
            version: '1.0.0',
            total_models: models.length,
            last_updated: new Date().toISOString().split('T')[0],
            dataset: 'sample',
            dna_dimension: 128,
            note: 'Sample database with synthetic data - run with real dna-out data for actual results'
        }
    };

    await mkdir('./public', { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(database, null, 2));
    console.log(`\n✓ Sample database created at ${OUTPUT_FILE}`);
}

// Run
buildDatabase();
