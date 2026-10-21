import type { ModelData } from '@/utils/data';
import { coverageText, provenanceUrl } from '@/utils/coverage';

export function ResponseCoverage({ model }: { model: ModelData }) {
    const url = provenanceUrl(model);
    return <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
        <span>{coverageText(model)}</span>{url && <> · <a href={url} target="_blank" rel="noopener noreferrer">Provenance</a></>}
    </div>;
}
