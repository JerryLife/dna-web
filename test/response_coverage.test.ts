import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { chatProvenance } from '../scripts/chat_provenance.js';
import { coverageText, sharedCoverageText, provenanceUrl } from '../src/utils/coverage';
import { ResponseCoverage } from '../src/components/ResponseCoverage';
import type { ModelData } from '../src/utils/data';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const db = read('public/dna_database_chat.json');
const model = (name: string): ModelData => db.models.find((m: ModelData) => m.name === name);
const manifest = read('docs/dna-v101/chat_sota_20261019.json');

describe('response provenance', () => {
    it('keeps every published model count reproducible in the database and public manifest', () => {
        expect(read('public/provenance/chat_sota_20261019.json')).toEqual(manifest);
        for (const row of manifest.published) {
            expect(model(row.model).metadata.response_coverage).toEqual(chatProvenance(row.model).response_coverage);
        }
        expect(coverageText(model('nvidia/nemotron-3.5-lightning'))).toContain('98 capped outputs');
        expect(coverageText(model('mistralai/mistral-medium-3-5'))).toContain('97 capped outputs');
        expect(coverageText(model('nvidia/nemotron-3.5-super-vl'))).toContain('72 capped outputs');
    });
    it('exposes both zero counts and shared nonempty coverage without changing similarity', () => {
        const opus = model('anthropic/claude-opus-5.5'), fable = model('anthropic/claude-fable-5.1');
        expect(coverageText(opus)).toContain('56 documented refusals · 56 zero slots');
        expect(coverageText(fable)).toContain('48 documented refusals · 48 zero slots');
        expect(sharedCoverageText(opus, fable)).toContain('27/100');
        expect(sharedCoverageText(opus, fable)).toContain('not coverage-adjusted');
        const html = renderToStaticMarkup(createElement(ResponseCoverage, { model: opus }));
        expect(html).toContain('56 zero slots');
        expect(html).toContain('href="/provenance/chat_sota_20261019.json"');
    });
    it('does not invent zero counts or shared coverage for historical and uploaded models', () => {
        const unknown = { name: 'unrecorded' } as ModelData;
        expect(coverageText(unknown)).toBe('Response coverage not recorded');
        expect(sharedCoverageText(unknown, model('anthropic/claude-opus-5.5'))).toContain('unavailable');
        expect(chatProvenance(unknown.name)).toEqual({});
        expect(provenanceUrl({ metadata: { response_coverage: { provenance_url: 'javascript:bad' } } } as ModelData)).toBeUndefined();
    });
    it('publishes only allowlisted evidence and separates refusal from length exhaustion', () => {
        const evidence = read('docs/dna-v101/chat_sota_20261019_evidence.json');
        expect(read('public/provenance/chat_sota_20261019_evidence.json')).toEqual(evidence);
        const keys = ['model', 'selected_final', 'probe_index', 'attempt', 'finish_reason', 'native_finish_reason', 'message_refusal_present', 'final_content_nonempty', 'completion_tokens', 'reasoning_tokens', 'requested_max_tokens', 'classification'].sort();
        for (const row of evidence.records) expect(Object.keys(row).sort()).toEqual(keys);
        const empty = evidence.records.filter((r: any) => r.selected_final && !r.final_content_nonempty);
        expect(empty).toHaveLength(104);
        for (const row of empty) {
            expect(row.classification).toBe('explicit_refusal');
            expect(row.finish_reason).toBe('content_filter');
            expect(row.message_refusal_present || row.native_finish_reason === 'refusal').toBe(true);
        }
        const exhausted = evidence.records.find((r: any) => r.classification === 'length_limited_no_final_content');
        expect(exhausted.selected_final).toBe(false);
        expect(exhausted.finish_reason).toBe('length');
        expect(exhausted.message_refusal_present).toBe(false);
    });
});
