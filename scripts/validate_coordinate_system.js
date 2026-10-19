import { isDeepStrictEqual } from 'node:util';

// Every field is mandatory on both sides, including fields whose value is false.
export const COORDINATE_FIELDS = [
    'pipeline_version', 'encoder', 'encoder_revision', 'encoder_dtype', 'encoder_max_seq_length',
    'encoder_encode_normalize_embeddings', 'raw_embedding_dimension', 'pre_agg_embed_dim',
    'pre_agg_method', 'normalize_embeddings', 'pre_projection_normalization', 'aggregation_method',
    'reduction_method', 'dna_dim', 'random_seed', 'projection_rng', 'projection_dtype',
    'projection_column_normalization', 'projection_shape', 'projection_sha256',
    'probe_order', 'probe_order_sha256', 'probe_count', 'final_dna_normalization',
];

export function coordinateSystemFromDNA(dna) {
    const cfg = dna.metadata?.extractor_config;
    if (!cfg) throw new Error('Missing coordinate-system provenance');
    const actual = Object.fromEntries(COORDINATE_FIELDS.map(key => [key, cfg[key]]));
    actual.encoder_revision = cfg.provenance?.encoder_revision;
    actual.encoder_dtype = cfg.provenance?.encoder_dtype;
    actual.encoder_max_seq_length = cfg.provenance?.encoder_max_seq_length;
    actual.probe_count = dna.metadata.probe_count;
    return actual;
}

/** Reject incomplete or mixed numerical protocols before building a corrected database. */
export function validateCoordinateSystem(dna, expected) {
    if (!expected) throw new Error('Missing expected coordinate-system provenance');
    if (!Array.isArray(dna.signature) || dna.signature.length !== 128 ||
        !dna.signature.every(Number.isFinite) || dna.signature.every(value => value === 0)) {
        throw new Error('Invalid 128-dimensional DNA signature');
    }
    const actual = coordinateSystemFromDNA(dna);
    for (const key of COORDINATE_FIELDS) {
        if (expected[key] === undefined || expected[key] === null || actual[key] === undefined || actual[key] === null) {
            throw new Error(`Missing coordinate field: ${key}`);
        }
        if (!isDeepStrictEqual(actual[key], expected[key])) {
            throw new Error(`Incompatible DNA coordinate field: ${key}`);
        }
    }
    for (const key of Object.keys(expected)) {
        if (!COORDINATE_FIELDS.includes(key)) throw new Error(`Unknown coordinate field: ${key}`);
    }
    return actual;
}
