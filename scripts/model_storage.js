import { createHash } from 'node:crypto';

/** Original model IDs stay in metadata; paths never depend on case folding or lossy escaping. */
export function modelStorageId(modelId) {
    if (typeof modelId !== 'string' || !modelId.trim()) throw new Error('Missing original model ID');
    return 'm-' + createHash('sha256').update(modelId, 'utf8').digest('hex');
}

export function assertPortablePath(relativePath) {
    if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\')) {
        throw new Error(`Nonportable path: ${relativePath}`);
    }
    for (const component of relativePath.split('/')) {
        if (!component || component === '.' || component === '..' || component.length > 255 ||
            /[<>:"|?*\x00-\x1f]/.test(component) || /[. ]$/.test(component) ||
            /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(component)) {
            throw new Error(`Nonportable path: ${relativePath}`);
        }
    }
    return relativePath;
}

export function validateStorageEntry(directoryName, dna, seen = new Map()) {
    const model = dna.metadata?.model_name;
    const expected = modelStorageId(model);
    assertPortablePath(directoryName);
    if (directoryName !== expected) throw new Error(`Model storage mapping mismatch: ${model}`);
    if (seen.has(directoryName.toLowerCase())) {
        throw new Error(`Duplicate or colliding model storage ID: ${model}`);
    }
    seen.set(directoryName.toLowerCase(), model);
    return model;
}
