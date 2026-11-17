// One-way copy from dataset/runnable/<fn-id>/ (quarantined copies) into the
// live upstream/harness trees, overwriting what sync-generated.ts placed
// there. Stryker's smoke run and Stage 3 both run against these, never the
// raw dataset/generated originals, so a test that fails on unmodified code
// can't produce a meaningless "killed" result.
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
  let synced = 0;

  for (const entry of primaries) {
    const runnableDir = path.join(ROOT, 'dataset/runnable', entry.id);
    if (!fs.existsSync(runnableDir)) continue; // not loadable, no runnable copy
    const fileName = fs.readdirSync(runnableDir).find((f) => f.endsWith('.generated.test.ts'))!;
    fs.copyFileSync(path.join(runnableDir, fileName), path.join(ROOT, entry.testPath));
    synced++;
  }

  console.log(`Synced ${synced} runnable test files.`);
}

main();
