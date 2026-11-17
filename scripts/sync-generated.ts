// One-way copy from dataset/generated/<fn-id>/ to each manifest entry's
// testPath (inside upstream/<repo> for Mode A, harness/extracted/<repo> for
// Mode B). Our repo is the source of truth; the upstream/harness trees are
// disposable and rebuilt from here every time.
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

interface ManifestEntry {
  id: string;
  status: string;
  testPath: string;
}

function main() {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8'));
  const primaries = manifest.filter((e) => e.status === 'primary');

  for (const entry of primaries) {
    const genDir = path.join(ROOT, 'dataset/generated', entry.id);
    const files = fs.readdirSync(genDir).filter((f) => f.endsWith('.generated.test.ts'));
    if (files.length !== 1) {
      throw new Error(`expected exactly one generated test file for ${entry.id}, found ${files.length}`);
    }
    const srcFile = path.join(genDir, files[0]);
    const destFile = path.join(ROOT, entry.testPath);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(srcFile, destFile);
  }

  console.log(`Synced ${primaries.length} generated test files.`);
}

main();
