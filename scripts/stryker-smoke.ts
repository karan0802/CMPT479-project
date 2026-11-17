// Runs Stryker on every runnable suite and keeps the JSON report in
// results/stage1-smoke/. Proof that mutation testing works on all of them,
// plus mutant counts and timings — NOT the official numbers (Stage 3
// re-runs from the frozen tag with these same scripts).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runStryker } from './run-step.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RUN_ID = 'stage1-smoke';

interface ManifestEntry {
  id: string;
  status: string;
}

function main() {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8'));
  const primaries = manifest.filter((e) => e.status === 'primary');
  const summary: Record<string, unknown> = {};

  for (const entry of primaries) {
    const runnableDir = path.join(ROOT, 'dataset/runnable', entry.id);
    if (!fs.existsSync(runnableDir)) {
      summary[entry.id] = { skipped: 'not loadable' };
      console.log(`${entry.id}: skipped (not loadable)`);
      continue;
    }

    const result = runStryker(entry.id, RUN_ID, false);
    const mutationPath = path.join(ROOT, 'results', RUN_ID, entry.id, 'mutation.json');
    const timingPath = path.join(ROOT, 'results', RUN_ID, entry.id, 'timing-stryker.json');
    const timing = fs.existsSync(timingPath) ? JSON.parse(fs.readFileSync(timingPath, 'utf8')) : null;

    if (fs.existsSync(mutationPath)) {
      const mutation = JSON.parse(fs.readFileSync(mutationPath, 'utf8'));
      const mutants = Object.values(mutation.files as Record<string, { mutants: { status: string }[] }>).flatMap(
        (f) => f.mutants
      );
      const counts: Record<string, number> = {};
      for (const m of mutants) counts[m.status] = (counts[m.status] ?? 0) + 1;
      summary[entry.id] = { total: mutants.length, counts, seconds: timing?.seconds, exitCode: result.exitCode };
      console.log(`${entry.id}: ${mutants.length} mutants, ${JSON.stringify(counts)}`);
    } else {
      summary[entry.id] = { error: 'no mutation.json produced', exitCode: result.exitCode };
      console.log(`${entry.id}: FAILED, no mutation.json (exit ${result.exitCode})`);
    }
  }

  fs.mkdirSync(path.join(ROOT, 'results/stage1-smoke'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'results/stage1-smoke/summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('Wrote results/stage1-smoke/summary.json');
}

main();
