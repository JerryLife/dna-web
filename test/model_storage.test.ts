import { describe, it, expect } from 'vitest';
// @ts-expect-error JavaScript build helper.
import { modelStorageId, assertPortablePath, validateStorageEntry } from '../scripts/model_storage.js';
describe('portable model storage', () => {
    it('maps colons, escapes, slashes, underscores and case variants to distinct portable paths', () => {
        const names = ['org/model:free', 'org/model_free', 'org/model%3Afree', 'org/model%3afree',
            'org_model/free', 'org/model/free', 'Org/model:free', 'CON', 'nul.txt', '组织/模型', 'org/' + 'x'.repeat(400)];
        const paths = names.map(modelStorageId);
        expect(new Set(paths.map((p: string) => p.toLowerCase())).size).toBe(names.length);
        paths.forEach((p: string) => {
            expect(p).toMatch(/^m-[0-9a-f]{64}$/);
            expect(() => assertPortablePath(`dna-v101/chat/rand_chinese/${p}/dna.json`)).not.toThrow();
        });
        expect(modelStorageId('org/model:free')).toBe(modelStorageId('org/model:free'));
    });
    it.each(['CON', 'con.txt', 'NUL.json', 'com1', 'LPT9.txt', 'COM¹.txt', 'a:b', 'a?b', 'a*b',
        'a<b', 'a>b', 'a|b', 'a"b', 'a\\b', 'a\u0000b', 'a.', 'a ', '../x', '/absolute', 'a//b', 'x'.repeat(256)])(
        'rejects invalid/reserved Windows path %s', (p) => expect(() => assertPortablePath(p)).toThrow('Nonportable'));
    it('retains original IDs and rejects mapping mismatches and duplicates', () => {
        const dna = { metadata: { model_name: 'org/model:free' } };
        const path = modelStorageId(dna.metadata.model_name);
        const seen = new Map();
        expect(validateStorageEntry(path, dna, seen)).toBe('org/model:free');
        expect(() => validateStorageEntry(path, dna, seen)).toThrow('Duplicate or colliding');
        expect(() => validateStorageEntry(modelStorageId('org/model_free'), dna)).toThrow('mismatch');
        expect(() => modelStorageId('')).toThrow();
    });
});
