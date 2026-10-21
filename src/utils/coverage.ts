import type { ModelData } from './data';

export function coverageText(model: ModelData): string {
    const c = model.metadata?.response_coverage;
    if (!c) return 'Response coverage not recorded';
    return `${c.probe_count} probes · ${c.capped_output_count} capped outputs · ${c.documented_refusal_count} documented refusals · ${c.zero_slot_indices.length} zero slots`;
}

export function sharedCoverageText(a: ModelData, b: ModelData): string {
    const x = a.metadata?.response_coverage, y = b.metadata?.response_coverage;
    if (!x || !y || x.probe_set !== y.probe_set || x.probe_count !== y.probe_count) {
        return 'Shared nonempty probe coverage unavailable.';
    }
    const empty = new Set<number>([...x.zero_slot_indices, ...y.zero_slot_indices]);
    return `${x.probe_count - empty.size}/${x.probe_count} probe indices have nonempty final content in both models. Scores include zero slots; they are not coverage-adjusted.`;
}

export function provenanceUrl(model: ModelData): string | undefined {
    // Only the bundled, fixed provenance endpoint can become an HTML link.
    return model.metadata?.response_coverage?.provenance_url === '/provenance/chat_sota_20261019.json'
        ? '/provenance/chat_sota_20261019.json' : undefined;
}
