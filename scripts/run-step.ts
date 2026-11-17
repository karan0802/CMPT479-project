// Runs one check (vitest | coverage | tsc | stryker) for one function from
// the manifest, in the correct directory for its mode (A: in place inside
// the pinned upstream clone; B: in the shared extracted harness). Copies
// results to results/<run-id>/<fn-id>/ and records timing. This is what
// harness/run.sh delegates to — see that file for the plan's "one command"
// interface (section 2.3).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');

interface ManifestEntry {
  id: string;
  repo: string;
  sourcePath: string;
  lineStart: number;
  lineEnd: number;
  testPath: string;
  notes: { mode: string };
}

function loadEntry(fnId: string): ManifestEntry {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8'));
  const entry = manifest.find((e) => e.id === fnId);
  if (!entry) throw new Error(`unknown function id: ${fnId}`);
  return entry;
}

function repoKeyFromRepo(repo: string): 'dinero.js' | 'colord' | 'ibantools' {
  if (repo.includes('dinero.js')) return 'dinero.js';
  if (repo.includes('colord')) return 'colord';
  return 'ibantools';
}

function cwdFor(entry: ManifestEntry): string {
  return entry.notes.mode === 'A' ? path.join(ROOT, 'upstream', repoKeyFromRepo(entry.repo)) : path.join(ROOT, 'harness');
}

function runSh(cmd: string, cwd: string): { stdout: string; code: number } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: (e.stdout ?? '') + (e.stderr ?? ''), code: e.status ?? 1 };
  }
}

function ensureOutDir(runId: string, fnId: string): string {
  const outDir = path.join(ROOT, 'results', runId, fnId);
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

const ENV_PREFIX = 'TZ=UTC LANG=en_US.UTF-8 CI=1';

function vitestConfigArg(mode: string): string {
  return mode === 'A' ? '--config vitest.generated.config.ts' : '--config vitest.config.mts';
}

// Scopes every vitest/stryker run to exactly this function's own test file,
// never the glob of every *.generated.test.ts file. Required whenever a
// source file is shared by several functions (ibantools' single file; a
// couple of colord files) so Stryker's test-relatedness can't pull in
// another function's tests and so results are never a readout of the whole
// directory instead of the one function being measured.
function testIncludeFor(entry: ManifestEntry, cwd: string): string {
  return path.relative(cwd, path.join(ROOT, entry.testPath));
}

export function runVitest(fnId: string, runId: string): { exitCode: number; isolationOk: boolean } {
  const entry = loadEntry(fnId);
  const cwd = cwdFor(entry);
  const outDir = ensureOutDir(runId, fnId);
  const jsonOut = path.join(outDir, 'vitest.json');

  execSync('rm -rf reports', { cwd });
  const start = Date.now();
  const { code } = runSh(
    `${ENV_PREFIX} TEST_INCLUDE="${testIncludeFor(entry, cwd)}" VITEST_JSON=${jsonOut} npx vitest run ${vitestConfigArg(entry.notes.mode)}`,
    cwd
  );
  const seconds = (Date.now() - start) / 1000;

  let isolationOk = false;
  if (fs.existsSync(jsonOut)) {
    const report = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
    const files: string[] = (report.testResults ?? []).map((t: { name: string }) => t.name);
    isolationOk = files.length > 0 && files.every((f) => f.endsWith('.generated.test.ts'));
  }

  fs.writeFileSync(path.join(outDir, 'timing.json'), JSON.stringify({ step: 'vitest', seconds, exitCode: code }, null, 2));
  return { exitCode: code, isolationOk };
}

export function runCoverage(fnId: string, runId: string): void {
  const entry = loadEntry(fnId);
  const cwd = cwdFor(entry);
  const outDir = ensureOutDir(runId, fnId);
  const targetSrc = path.relative(cwd, path.join(ROOT, entry.sourcePath));

  execSync('rm -rf reports', { cwd });
  const covDir = path.join(outDir, 'coverage');
  const start = Date.now();
  runSh(
    `${ENV_PREFIX} TEST_INCLUDE="${testIncludeFor(entry, cwd)}" TARGET_SRC="${targetSrc}" COVERAGE_DIR="${path.relative(cwd, covDir)}" npx vitest run ${vitestConfigArg(entry.notes.mode)} --coverage`,
    cwd
  );
  const seconds = (Date.now() - start) / 1000;
  fs.writeFileSync(path.join(outDir, 'timing-coverage.json'), JSON.stringify({ step: 'coverage', seconds }, null, 2));
}

// Scoped to just this function's source + test file, for the same reason
// writeScopedConfigs is below: the base tsconfig's `include` covers every
// function in the repo, so an unscoped `tsc -p` would report (and be
// blocked by) every OTHER function's compile errors too, not just this
// one's.
function writeScopedTsconfig(entry: ManifestEntry, cwd: string): { name: string; cleanup: () => void } {
  const baseTsconfigName = entry.notes.mode === 'A' ? 'tsconfig.generated.json' : 'tsconfig.json';
  const relSource = path.relative(cwd, path.join(ROOT, entry.sourcePath));
  const relTest = testIncludeFor(entry, cwd);
  const name = `.tsconfig.run.${entry.id}.json`;
  fs.writeFileSync(path.join(cwd, name), JSON.stringify({ extends: `./${baseTsconfigName}`, include: [relSource, relTest] }, null, 2));
  return { name, cleanup: () => fs.rmSync(path.join(cwd, name), { force: true }) };
}

export function runTsc(fnId: string, runId: string): { exitCode: number; output: string } {
  const entry = loadEntry(fnId);
  const cwd = cwdFor(entry);
  const outDir = ensureOutDir(runId, fnId);
  const { name, cleanup } = writeScopedTsconfig(entry, cwd);

  const { stdout, code } = runSh(`npx tsc -p ${name}`, cwd);
  fs.writeFileSync(path.join(outDir, 'tsc.txt'), stdout);
  cleanup();
  return { exitCode: code, output: stdout };
}

// Stryker's typescript checker type-checks everything its tsconfigFile's
// `include` matches, in one pass, before touching the mutate target. When
// several functions' test files live under that same include (true of
// every function in a given repo, once all 24 are synced in), a compile
// error in ANY of them blocks the checker — and therefore every mutation
// run — for every OTHER function too. So each run gets its own throwaway
// tsconfig + Stryker config, scoped to just this one function's source file
// and test file, regardless of what else is broken elsewhere in the repo.
function writeScopedConfigs(entry: ManifestEntry, cwd: string): { strykerConfigRel: string; cleanup: () => void } {
  const baseStrykerConf = JSON.parse(fs.readFileSync(path.join(cwd, 'stryker.conf.json'), 'utf8'));
  const tsconfig = writeScopedTsconfig(entry, cwd);

  const scopedStrykerName = `.stryker.run.${entry.id}.json`;
  fs.writeFileSync(
    path.join(cwd, scopedStrykerName),
    JSON.stringify({ ...baseStrykerConf, tsconfigFile: tsconfig.name }, null, 2)
  );

  return {
    strykerConfigRel: scopedStrykerName,
    cleanup: () => {
      tsconfig.cleanup();
      fs.rmSync(path.join(cwd, scopedStrykerName), { force: true });
    },
  };
}

export function runStryker(fnId: string, runId: string, dryRunOnly: boolean): { exitCode: number; output: string } {
  const entry = loadEntry(fnId);
  const cwd = cwdFor(entry);
  const outDir = ensureOutDir(runId, fnId);
  const relSource = path.relative(cwd, path.join(ROOT, entry.sourcePath));
  const mutateArg = `${relSource}:${entry.lineStart}-${entry.lineEnd}`;
  const { strykerConfigRel, cleanup } = writeScopedConfigs(entry, cwd);

  execSync('rm -rf reports .stryker-tmp', { cwd });
  const flag = dryRunOnly ? '--dryRunOnly' : '';
  const start = Date.now();
  const { stdout, code } = runSh(
    `${ENV_PREFIX} TEST_INCLUDE="${testIncludeFor(entry, cwd)}" npx stryker run ${strykerConfigRel} ${flag} --mutate "${mutateArg}"`,
    cwd
  );
  const seconds = (Date.now() - start) / 1000;

  if (!dryRunOnly && fs.existsSync(path.join(cwd, 'reports/mutation/mutation.json'))) {
    fs.copyFileSync(path.join(cwd, 'reports/mutation/mutation.json'), path.join(outDir, 'mutation.json'));
  }
  fs.writeFileSync(path.join(outDir, 'timing-stryker.json'), JSON.stringify({ step: 'stryker', seconds, exitCode: code }, null, 2));
  execSync('rm -rf reports .stryker-tmp', { cwd });
  cleanup();
  return { exitCode: code, output: stdout };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [repoArg, fnId, step] = process.argv.slice(2);
  const runId = process.env.RUN_ID ?? 'manual';
  if (!fnId || !step) {
    console.error('usage: run-step.ts <repo> <fn-id> <vitest|coverage|tsc|stryker>');
    process.exit(1);
  }
  switch (step) {
    case 'vitest':
      console.log(JSON.stringify(runVitest(fnId, runId)));
      break;
    case 'coverage':
      runCoverage(fnId, runId);
      break;
    case 'tsc':
      console.log(JSON.stringify(runTsc(fnId, runId)));
      break;
    case 'stryker':
      console.log(JSON.stringify(runStryker(fnId, runId, false)));
      break;
    default:
      console.error(`unknown step: ${step}`);
      process.exit(1);
  }
}
