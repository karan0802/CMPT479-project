// Copies each selected function's whole source file verbatim into
// dataset/subjects/<fn-id>/source.ts, with a provenance.json recording
// exactly where it came from. This snapshot is what the prompt is built
// from in Phase 5, and survives even if the upstream repo disappears.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');

interface ManifestEntry {
  id: string;
  status: string;
  repo: string;
  upstreamSha: string;
  sourcePath: string;
  lineStart: number;
  lineEnd: number;
}

const LICENSE_BY_REPO: Record<string, string> = {
  'dinerojs/dinero.js': 'MIT',
  'omgovich/colord': 'MIT',
  'Simplify/ibantools': 'MIT OR MPL-2.0',
};

const TAG_BY_REPO: Record<string, string> = {
  'dinerojs/dinero.js': 'v2.0.2',
  'omgovich/colord': 'v2.9',
  'Simplify/ibantools': '4.5.4',
};

function main() {
  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8')
  );

  for (const entry of manifest) {
    const srcAbsPath = path.join(ROOT, entry.sourcePath);
    const content = fs.readFileSync(srcAbsPath);
    const outDir = path.join(ROOT, 'dataset/subjects', entry.id);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'source.ts'), content);

    const provenance = {
      functionId: entry.id,
      status: entry.status,
      repo: entry.repo,
      tag: TAG_BY_REPO[entry.repo],
      sha: entry.upstreamSha,
      originalPath: entry.sourcePath.replace(/^upstream\/[^/]+\//, '').replace(/^harness\/extracted\/[^/]+\//, ''),
      lineStart: entry.lineStart,
      lineEnd: entry.lineEnd,
      license: LICENSE_BY_REPO[entry.repo],
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
    };
    fs.writeFileSync(path.join(outDir, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  }

  console.log(`Snapshotted ${manifest.length} subjects into dataset/subjects/`);
}

main();
