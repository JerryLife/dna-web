import { describe, expect, it } from 'vitest';
// @ts-expect-error JavaScript build helper has no declaration file.
import { COORDINATE_FIELDS, validateCoordinateSystem } from '../scripts/validate_coordinate_system.js';
const expected: Record<string, any> = {
    pipeline_version: 'text-dna-concat-v1', encoder: 'Qwen/Qwen3-Embedding-8B', encoder_revision: 'pinned',
    encoder_dtype: 'torch.float32', encoder_max_seq_length: 40960, encoder_encode_normalize_embeddings: false,
    raw_embedding_dimension: 4096, pre_agg_embed_dim: 64, pre_agg_method: 'matryoshka_prefix',
    normalize_embeddings: false, pre_projection_normalization: 'none', aggregation_method: 'concat',
    reduction_method: 'random_projection', dna_dim: 128, random_seed: 42,
    projection_rng: 'numpy.random.RandomState(MT19937).randn', projection_dtype: 'float32',
    projection_column_normalization: 'l2', projection_shape: [6400,128], projection_sha256: 'projection',
    probe_order: 'provided_probe_inputs', probe_order_sha256: 'probes', probe_count: 100, final_dna_normalization: 'none'
};
function sample(): any {
    return { signature: Array(128).fill(1), metadata: { probe_count: 100, extractor_config: {
        ...structuredClone(expected), provenance: { encoder_revision: 'pinned', encoder_dtype: 'torch.float32', encoder_max_seq_length: 40960 }
    } } };
}
function fieldOwner(dna: any, field: string) {
    if (field === 'probe_count') return dna.metadata;
    if (['encoder_revision', 'encoder_dtype', 'encoder_max_seq_length'].includes(field)) return dna.metadata.extractor_config.provenance;
    return dna.metadata.extractor_config;
}
describe('complete corrected DNA coordinate contract', () => {
    it('accepts matching signatures and independently allocated shape arrays', () => {
        expect(validateCoordinateSystem(sample(), structuredClone(expected))).toEqual(expected);
    });
    it.each(COORDINATE_FIELDS)('rejects incompatible %s', (field: string) => {
        const dna = sample(); fieldOwner(dna, field)[field] = 'incompatible';
        expect(() => validateCoordinateSystem(dna, expected)).toThrow(`Incompatible DNA coordinate field: ${field}`);
    });
    it.each(COORDINATE_FIELDS)('rejects missing actual %s', (field: string) => {
        const dna = sample(); delete fieldOwner(dna, field)[field];
        expect(() => validateCoordinateSystem(dna, expected)).toThrow(`Missing coordinate field: ${field}`);
    });
    it.each(COORDINATE_FIELDS)('rejects missing expected %s', (field: string) => {
        const incomplete = { ...expected }; delete incomplete[field];
        expect(() => validateCoordinateSystem(sample(), incomplete)).toThrow(`Missing coordinate field: ${field}`);
    });
    it('rejects absent contracts and unknown fields', () => {
        expect(() => validateCoordinateSystem(sample(), undefined)).toThrow();
        expect(() => validateCoordinateSystem(sample(), { ...expected, typo: true })).toThrow('Unknown');
        expect(() => validateCoordinateSystem({ signature: Array(128).fill(1), metadata: {} }, expected)).toThrow();
    });
    it('rejects nonfinite, wrong-sized and empty signatures', () => {
        for (const signature of [Array(128).fill(NaN), Array(127).fill(1), Array(128).fill(0)]) {
            const dna = sample(); dna.signature = signature;
            expect(() => validateCoordinateSystem(dna, expected)).toThrow();
        }
    });
});
