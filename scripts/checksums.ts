// Writes dataset/CHECKSUMS.sha256 covering the manifest, prompts, raw,
// generated, runnable, test-cases.json and validation files. After the
// freeze tag, any change to these means a new dataset version.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');

const COVERED_DIRS = [
  'dataset/manifest.json',
  'dataset/upstream.lock.json',
  'dataset/candidates.csv',
  'dataset/prompts',
  'dataset/raw',
  'dataset/generated',
  'dataset/runnable',
  'dataset/subjects',
  'dataset/validation',
  'dataset/test-cases.json',
];

function listFiles(target: string): string[] {
  const abs = path.join(ROOT, target);
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [target];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(target, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(rel));
    else out.push(rel);
  }
  return out;
}

function main() {
  const files = COVERED_DIRS.flatMap(listFiles).sort();
  const lines = files.map((f) => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
    return `${hash}  ${f}`;
  });
  fs.writeFileSync(path.join(ROOT, 'dataset/CHECKSUMS.sha256'), lines.join('\n') + '\n');
  console.log(`Wrote checksums for ${files.length} files to dataset/CHECKSUMS.sha256`);
}

main();
