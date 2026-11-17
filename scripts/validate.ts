// Validates every synced suite without editing it: does it compile, does it
// load, does it execute consistently across 3 runs, what's its coverage,
// does isolation hold. Writes dataset/validation/<fn-id>.json. Compile and
// load failures are kept as results, not fixed — see decision log in the
// plan (never edit LLM output).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { runVitest, runTsc, runCoverage } from './run-step.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RUN_ID = 'validate';

interface ManifestEntry {
  id: string;
  status: string;
  sourcePath: string;
  testPath: string;
  notes: { mode: string };
}

interface VitestAssertion {
  fullName: string;
  status: string;
  duration: number;
  failureMessages: string[];
}

interface VitestFileResult {
  name: string;
  status: string;
  message: string;
  assertionResults: VitestAssertion[];
}

function toolchainVersions(): Record<string, string> {
  const get = (cmd: string) => execSync(cmd, { encoding: 'utf8' }).trim();
  return {
    node: get('node -v'),
    npm: get('npm -v'),
  };
}

function readVitestJson(runId: string, fnId: string): { success: boolean; fileResult: VitestFileResult | null } {
  const jsonPath = path.join(ROOT, 'results', runId, fnId, 'vitest.json');
  if (!fs.existsSync(jsonPath)) return { success: false, fileResult: null };
  const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const fileResult: VitestFileResult | undefined = report.testResults?.[0];
  return { success: !!report.success, fileResult: fileResult ?? null };
}

function main() {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8'));
  const onlyIds = process.argv.slice(2);
  const primaries = manifest.filter((e) => e.status === 'primary' && (onlyIds.length === 0 || onlyIds.includes(e.id)));
  const toolchain = toolchainVersions();
  fs.mkdirSync(path.join(ROOT, 'dataset/validation'), { recursive: true });

  for (const entry of primaries) {
    const rawResponse = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'dataset/raw', entry.id, 'response.json'), 'utf8')
    );
    const extractionOk = rawResponse.extraction === 'ok';

    const tscResult = runTsc(entry.id, RUN_ID);
    const compiles = tscResult.exitCode === 0;

    // Run 3 times for the determinism check (6.6), each with its own run id
    // so results don't overwrite each other.
    const runs: { success: boolean; fileResult: VitestFileResult | null; isolationOk: boolean }[] = [];
    for (let i = 0; i < 3; i++) {
      const runId = `${RUN_ID}-run${i + 1}`;
      const { isolationOk } = runVitest(entry.id, runId);
      const { success, fileResult } = readVitestJson(runId, entry.id);
      runs.push({ success, fileResult, isolationOk });
    }

    const loads = runs.some((r) => r.fileResult !== null && (r.fileResult.assertionResults.length > 0 || r.fileResult.status !== 'failed'));
    const isolationOk = runs.every((r) => r.isolationOk);

    const testCaseNames = new Set<string>();
    for (const r of runs) {
      for (const a of r.fileResult?.assertionResults ?? []) testCaseNames.add(a.fullName);
    }

    const perTestAcrossRuns: Record<string, { statuses: string[]; failureMessages: string[][]; durations: number[] }> = {};
    for (const name of testCaseNames) perTestAcrossRuns[name] = { statuses: [], failureMessages: [], durations: [] };
    for (const r of runs) {
      const byName = new Map((r.fileResult?.assertionResults ?? []).map((a) => [a.fullName, a]));
      for (const name of testCaseNames) {
        const a = byName.get(name);
        perTestAcrossRuns[name].statuses.push(a?.status ?? 'missing');
        perTestAcrossRuns[name].failureMessages.push(a?.failureMessages ?? []);
        perTestAcrossRuns[name].durations.push(a?.duration ?? 0);
      }
    }

    const perTest = Object.fromEntries(
      Object.entries(perTestAcrossRuns).map(([name, v]) => [
        name,
        {
          statuses: v.statuses,
          flaky: new Set(v.statuses).size > 1,
          failureMessages: v.failureMessages.flat().filter(Boolean),
          durations: v.durations,
        },
      ])
    );

    runCoverage(entry.id, RUN_ID);
    const covSummaryPath = path.join(ROOT, 'results', RUN_ID, entry.id, 'coverage', 'coverage-summary.json');
    let coverage: unknown = null;
    if (fs.existsSync(covSummaryPath)) {
      const covSummary = JSON.parse(fs.readFileSync(covSummaryPath, 'utf8'));
      const targetFile = Object.keys(covSummary).find((k) => k !== 'total');
      coverage = targetFile ? covSummary[targetFile] : covSummary.total ?? null;
    }

    const validation = {
      functionId: entry.id,
      extractionOk,
      compiles,
      compileDiagnostics: tscResult.output.split('\n').filter(Boolean),
      loads,
      isolationOk,
      perTest,
      coverage,
      toolchain,
    };

    fs.writeFileSync(
      path.join(ROOT, 'dataset/validation', `${entry.id}.json`),
      JSON.stringify(validation, null, 2) + '\n'
    );
    console.log(`${entry.id}: compiles=${compiles} loads=${loads} isolationOk=${isolationOk}`);
  }
}

main();
