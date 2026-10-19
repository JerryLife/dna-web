import { execFileSync } from 'node:child_process';
import { assertPortablePath } from './model_storage.js';
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean);
const seen = new Map();
for (const path of paths) {
    assertPortablePath(path);
    const key = path.toLowerCase();
    if (seen.has(key) && seen.get(key) !== path) throw new Error(`Windows case collision: ${path}`);
    seen.set(key, path);
}
console.log(`Validated ${paths.length} tracked paths for Windows.`);
