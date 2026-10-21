"""Export allowlisted provider fields; never publish prompts, responses or request headers."""
import argparse
import json
from pathlib import Path
from collections import Counter


def sanitized(record):
    choice = (record.get('raw', {}).get('choices') or [{}])[0]
    message = choice.get('message', {})
    content = message.get('content')
    nonempty = isinstance(content, str) and bool(content.strip())
    refusal = message.get('refusal')
    refusal_present = isinstance(refusal, str) and bool(refusal.strip())
    finish, native = choice.get('finish_reason'), choice.get('native_finish_reason')
    usage = record.get('raw', {}).get('usage', {})
    reasoning = (usage.get('completion_tokens_details') or {}).get('reasoning_tokens')
    if finish == 'content_filter' and (refusal_present or native == 'refusal'):
        classification = 'explicit_refusal'
    elif nonempty and finish in ['stop', 'length']:
        classification = 'capped_output' if finish == 'length' else 'final_content'
    elif not nonempty and finish == 'length':
        classification = 'length_limited_no_final_content'
    else:
        classification = 'missing_or_unaccepted_final_content'
    return dict(probe_index=record['index'], attempt=record['attempt'],
                finish_reason=finish, native_finish_reason=native,
                message_refusal_present=refusal_present, final_content_nonempty=nonempty,
                completion_tokens=usage.get('completion_tokens'), reasoning_tokens=reasoning,
                requested_max_tokens=record['request'].get('max_tokens'), classification=classification)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('responses', type=Path)
    args = parser.parse_args()
    manifest_path = Path('docs/dna-v101/chat_sota_20261019.json')
    manifest = json.loads(manifest_path.read_text())
    records = []
    audits = []
    for model in manifest['published']:
        directory = args.responses/model['model'].replace('/', '_')
        final = [sanitized(json.loads((directory/f'{i:03d}.json').read_text())) for i in range(100)]
        empty = [r['probe_index'] for r in final if not r['final_content_nonempty']]
        refused = [r['probe_index'] for r in final if r['classification'] == 'explicit_refusal']
        assert empty == model['empty_indices'] == refused == model['known_refusal_indices']
        assert sum(r['classification'] == 'capped_output' for r in final) == model['output_capped_count']
        audits.append(dict(model=model['model'], final_classification_counts=dict(Counter(r['classification'] for r in final))))
        # Publish every accepted empty slot, plus one example of each nonempty class per model.
        seen = set()
        for r in final:
            if not r['final_content_nonempty'] or r['classification'] not in seen:
                records.append(dict(model=model['model'], selected_final=True, **r))
                seen.add(r['classification'])
        for path in sorted(directory.glob('*.attempt*.json')):
            r = sanitized(json.loads(path.read_text()))
            if r['classification'] in ['length_limited_no_final_content', 'missing_or_unaccepted_final_content']:
                records.append(dict(model=model['model'], selected_final=False, **r))
    evidence = dict(schema_version=1, probe_index_base=0,
        classification_rules={
            'explicit_refusal': 'finish_reason=content_filter AND (nonempty message.refusal OR native_finish_reason=refusal). Only these accepted empty responses become zero slots.',
            'capped_output': 'Nonempty final content AND finish_reason=length; retained as capped text.',
            'final_content': 'Nonempty final content AND finish_reason=stop.',
            'length_limited_no_final_content': 'Empty final content AND finish_reason=length. Not a refusal; retried with larger token budget. Reasoning-token usage is supporting evidence, not proof of the sole cause.',
            'missing_or_unaccepted_final_content': 'Anything else; not accepted as a refusal or zero slot.'},
        sanitization='Allowlist only. No prompts, final text, reasoning text, refusal text, credentials, request IDs or headers. These are author-exported provider fields, not cryptographically authenticated provider attestations.',
        audit=audits, records=records)
    manifest['sanitized_evidence_url'] = '/provenance/chat_sota_20261019_evidence.json'
    for path, data in [(manifest_path, manifest), (Path('docs/dna-v101/chat_sota_20261019_evidence.json'), evidence)]:
        path.write_text(json.dumps(data, indent=2)+'\n')
    public = Path('public/provenance'); public.mkdir(exist_ok=True)
    for path in [manifest_path, Path('docs/dna-v101/chat_sota_20261019_evidence.json')]:
        (public/path.name).write_bytes(path.read_bytes())
    print(f'Checked {len(audits)*100} final records; exported {len(records)} sanitized examples.')

if __name__ == '__main__':
    main()
