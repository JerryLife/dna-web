import manifest from '../docs/dna-v101/chat_sota_20261019.json' with { type: 'json' };

export function chatProvenance(name) {
    const entry = manifest.published.find(item => item.model === name);
    if (!entry) return {};
    return { response_coverage: {
        probe_count: manifest.coordinate_system.probe_count,
        capped_output_count: entry.output_capped_count,
        documented_refusal_count: entry.known_refusal_indices.length,
        zero_slot_indices: entry.empty_indices,
        probe_set: manifest.coordinate_system.probe_order_sha256,
        provenance_url: '/provenance/chat_sota_20261019.json',
    } };
}
