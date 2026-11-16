// For each primary function in the manifest, writes a trivial placeholder
// test (no real assertions — Phase 5 overwrites this with the real
// generated test later), runs Stryker's dry run to count mutants, records
// mutantCount back into the manifest, then removes the placeholder.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');

interface ManifestEntry {
  id: string;
  status: string;
  repo: string;
  sourcePath: string;
  exportName: string;
  lineStart: number;
  lineEnd: number;
  testPath: string;
  mutantCount: number | null;
  notes: { mode: string; tracer: boolean };
}

function repoNameFromSourcePath(sourcePath: string): 'dinero.js' | 'colord' | 'ibantools' {
  if (sourcePath.startsWith('upstream/dinero.js')) return 'dinero.js';
  if (sourcePath.startsWith('harness/extracted/colord')) return 'colord';
  return 'ibantools';
}

function placeholderTest(): string {
  return `import { describe, it, expect } from 'vitest';

// Placeholder for the Phase 4 feasibility dry run only. Phase 5 overwrites
// this file with the real LLM-generated suite.
describe('placeholder', () => {
  it('is replaced by the generated suite in Phase 5', () => {
    expect(true).toBe(true);
  });
});
`;
}

function runStryker(cwd: string, mutateArg: string): number {
  execSync('rm -rf reports .stryker-tmp', { cwd });
  // --dryRunOnly never writes a JSON report (no mutations are executed), so
  // the mutant count is read from its own log line instead. Instrumentation
  // (and that log line) happens before the dry run itself, so the count is
  // recoverable even when the dry run then fails for an unrelated reason
  // (e.g. no existing test imports this exact file yet).
  let output: string;
  try {
    output = execSync(
      `TZ=UTC LANG=en_US.UTF-8 CI=1 npx stryker run --dryRunOnly --mutate "${mutateArg}" 2>&1`,
      { cwd, encoding: 'utf8' }
    );
  } catch (err) {
    output = (err as { stdout?: string }).stdout ?? '';
  }
  const match = output.match(/Instrumented \d+ source file\(s\) with (\d+) mutant\(s\)/);
  if (!match) {
    throw new Error('could not find mutant count in Stryker output');
  }
  execSync('rm -rf reports .stryker-tmp', { cwd });
  return Number(match[1]);
}

function main() {
  const manifestPath = path.join(ROOT, 'dataset/manifest.json');
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const primaries = manifest.filter((e) => e.status === 'primary');

  for (const entry of primaries) {
    const repo = repoNameFromSourcePath(entry.sourcePath);
    const testAbsPath = path.join(ROOT, entry.testPath);
    const mode = entry.notes.mode;

    fs.writeFileSync(testAbsPath, placeholderTest());

    try {
      let cwd: string;
      let mutateArg: string;
      if (mode === 'A') {
        cwd = path.join(ROOT, 'upstream', repo);
        mutateArg = `${path.relative(cwd, path.join(ROOT, entry.sourcePath))}:${entry.lineStart}-${entry.lineEnd}`;
      } else {
        cwd = path.join(ROOT, 'harness');
        mutateArg = `${path.relative(cwd, path.join(ROOT, entry.sourcePath))}:${entry.lineStart}-${entry.lineEnd}`;
      }

      const count = runStryker(cwd, mutateArg);
      entry.mutantCount = count;
      const flag = count < 10 || count > 120 ? '  <-- outside 10-120 budget (H6)' : '';
      console.log(`${entry.id}: ${count} mutants${flag}`);
    } catch (err) {
      console.log(`${entry.id}: FAILED (${(err as Error).message})`);
      entry.mutantCount = -1;
    } finally {
      fs.rmSync(testAbsPath, { force: true });
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Updated dataset/manifest.json with mutantCount for all primaries.');
}

main();
