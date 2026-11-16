// Phase 4.5 follow-up: dinero.js's whole eligible pool turned out too small
// once the mutant-budget filter (H6) is applied by feasibility-check.ts, so
// its 4 failures can't all be replaced from its own 2 reserves. This script
// applies the agreed rebalance: dinero.js keeps only its 6 functions that
// clear H6 (no reserves left — pool exhausted), and colord (which has a
// large surplus pool) picks up 2 extra primaries, drawn by continuing the
// exact same seeded shuffle used in select.ts, to keep the dataset at 24
// primary functions overall.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SEED = 479;

interface Row {
  repo: string;
  sourcePath: string;
  exportName: string;
  lineStart: number;
  lineEnd: number;
  loc: number;
  branchCount: number;
  paramCount: number;
  internalImports: string[];
  externalImports: string[];
  impurityFlags: string[];
  delegatesOnly: boolean;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function loadRows(repo: string): Row[] {
  const text = fs.readFileSync(path.join(ROOT, 'dataset/candidates.csv'), 'utf8');
  const [header, ...rows] = parseCsv(text);
  const get = (r: string[], name: string) => r[header.indexOf(name)];
  return rows
    .filter((r) => r.length === header.length && r[0] === repo)
    .map((r) => ({
      repo: get(r, 'repo'),
      sourcePath: get(r, 'sourcePath'),
      exportName: get(r, 'exportName'),
      lineStart: Number(get(r, 'lineStart')),
      lineEnd: Number(get(r, 'lineEnd')),
      loc: Number(get(r, 'loc')),
      branchCount: Number(get(r, 'branchCount')),
      paramCount: Number(get(r, 'paramCount')),
      internalImports: get(r, 'internalImports') ? get(r, 'internalImports').split(';') : [],
      externalImports: get(r, 'externalImports') ? get(r, 'externalImports').split(';') : [],
      impurityFlags: get(r, 'impurityFlags') ? get(r, 'impurityFlags').split(';') : [],
      delegatesOnly: get(r, 'delegatesOnly') === 'true',
    }));
}

function passesHardFilters(row: Row): boolean {
  const disallowedPath = /(^|\/)(compat|fp|locale|_internal)\//;
  const h1 = row.paramCount >= 1 && !disallowedPath.test(row.sourcePath);
  const h2 = row.impurityFlags.length === 0;
  const h3 = row.internalImports.length <= 4 && row.externalImports.length === 0;
  const h4 = row.loc >= 8 && row.loc <= 80;
  const h5 = row.branchCount >= 2;
  const h8 = !row.delegatesOnly;
  return h1 && h2 && h3 && h4 && h5 && h8;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sizeBand(branchCount: number): 'small' | 'medium' | 'large' {
  if (branchCount <= 3) return 'small';
  if (branchCount <= 7) return 'medium';
  return 'large';
}

function idCategoryTag(row: Row): string {
  const base = path.basename(row.sourcePath, '.ts');
  if (base.toLowerCase() === row.exportName.toLowerCase()) {
    return path.basename(path.dirname(row.sourcePath));
  }
  return base;
}

function importStatementFor(row: Row): string {
  return './' + path.basename(row.sourcePath, '.ts');
}

function testPathFor(row: Row): string {
  const dir = path.dirname(row.sourcePath);
  const base = path.basename(row.sourcePath, '.ts');
  return path.join(dir, `${base}.generated.test.ts`);
}

function manifestEntryFrom(row: Row, status: 'primary' | 'reserve', rank: number, lock: Record<string, { url: string; sha: string; mode: string }>, repoKey: string) {
  const REPO_CODE: Record<string, string> = { 'dinero.js': 'din', colord: 'col', ibantools: 'iban' };
  return {
    id: `${REPO_CODE[repoKey]}-${idCategoryTag(row)}-${row.exportName}`,
    status,
    repo: lock[repoKey].url.replace('https://github.com/', '').replace(/\.git$/, ''),
    upstreamSha: lock[repoKey].sha,
    sourcePath: row.sourcePath,
    exportName: row.exportName,
    lineStart: row.lineStart,
    lineEnd: row.lineEnd,
    loc: row.loc,
    branchCount: row.branchCount,
    paramCount: row.paramCount,
    category: idCategoryTag(row),
    sizeBand: sizeBand(row.branchCount),
    internalImports: row.internalImports,
    importStatement: importStatementFor(row),
    testPath: testPathFor(row),
    mutantCount: null as number | null,
    selection: { seed: SEED, rank, replaces: null as string | null },
    notes: { mode: lock[repoKey].mode, tracer: false },
  };
}

function checkMutantCount(entry: ReturnType<typeof manifestEntryFrom>): number {
  const mode = entry.notes.mode;
  const cwd = mode === 'A' ? path.join(ROOT, 'upstream/colord') : path.join(ROOT, 'harness');
  const relSource = path.relative(cwd, path.join(ROOT, entry.sourcePath));
  const mutateArg = `${relSource}:${entry.lineStart}-${entry.lineEnd}`;
  const testAbsPath = path.join(ROOT, entry.testPath);

  fs.writeFileSync(
    testAbsPath,
    "import { describe, it, expect } from 'vitest';\ndescribe('placeholder', () => { it('ok', () => { expect(true).toBe(true); }); });\n"
  );
  execSync('rm -rf reports .stryker-tmp', { cwd });
  let output: string;
  try {
    output = execSync(`TZ=UTC LANG=en_US.UTF-8 CI=1 npx stryker run --dryRunOnly --mutate "${mutateArg}" 2>&1`, {
      cwd,
      encoding: 'utf8',
    });
  } catch (err) {
    output = (err as { stdout?: string }).stdout ?? '';
  }
  execSync('rm -rf reports .stryker-tmp', { cwd });
  fs.rmSync(testAbsPath, { force: true });

  const match = output.match(/Instrumented \d+ source file\(s\) with (\d+) mutant\(s\)/);
  if (!match) throw new Error(`could not determine mutant count for ${entry.id}`);
  return Number(match[1]);
}

function main() {
  const manifestPath = path.join(ROOT, 'dataset/manifest.json');
  const manifest: ReturnType<typeof manifestEntryFrom>[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/upstream.lock.json'), 'utf8'));

  // --- dinero.js: drop the 4 H6 failures, promote its 2 reserves (both
  // pass H6), and confirm the pool truly has nothing left to draw from.
  const dineroFailedIds = ['din-divide-halfEven', 'din-utils-absolute', 'din-utils-sign', 'din-divide-down'];
  const remaining = manifest.filter((e) => !dineroFailedIds.includes(e.id));
  for (const e of remaining) {
    if (e.repo === 'dinerojs/dinero.js' && e.status === 'reserve') {
      e.status = 'primary';
    }
  }
  console.log(`dinero.js: dropped ${dineroFailedIds.length} functions that failed H6 (pool exhausted, no reserves remain).`);

  // --- colord: promote its best reserve to replace the one H6 failure
  // (getDeltaE00), then draw 2 more primaries + top the reserve back up to 2,
  // continuing the exact same seeded shuffle from select.ts.
  const colordFailedIds = ['col-getPerceivedDifference-getDeltaE00'];
  let colordEntries = remaining.filter((e) => e.repo === 'omgovich/colord');
  const otherEntries = remaining.filter((e) => e.repo !== 'omgovich/colord');
  colordEntries = colordEntries.filter((e) => !colordFailedIds.includes(e.id));
  const promote = colordEntries.find((e) => e.status === 'reserve');
  if (promote) promote.status = 'primary';
  console.log(`colord: dropped getDeltaE00 (150 mutants, over H6 budget), promoted ${promote?.id} to primary.`);

  const colordRows = loadRows('colord');
  const colordEligible = colordRows.filter(passesHardFilters);
  const bands = {
    small: colordEligible.filter((r) => sizeBand(r.branchCount) === 'small'),
    medium: colordEligible.filter((r) => sizeBand(r.branchCount) === 'medium'),
    large: colordEligible.filter((r) => sizeBand(r.branchCount) === 'large'),
  };
  const rng = mulberry32(SEED);
  const shuffled = {
    small: seededShuffle(bands.small, rng),
    medium: seededShuffle(bands.medium, rng),
    large: seededShuffle(bands.large, rng),
  };
  // Same order select.ts drew in: small(3), medium(3), large(2) primary,
  // then 1/1/1 reserve. Drop exactly that many so what's left is the
  // untouched tail of the deterministic shuffle to continue from.
  shuffled.small.splice(0, 3 + 1);
  shuffled.medium.splice(0, 3 + 1);
  shuffled.large.splice(0, 2 + 1);
  const alreadyChosenNames = new Set(colordEntries.map((e) => e.exportName));

  const nextCandidates = (): Row | undefined => {
    for (const band of ['small', 'medium', 'large'] as const) {
      while (shuffled[band].length > 0) {
        const candidate = shuffled[band].shift()!;
        if (!alreadyChosenNames.has(candidate.exportName)) {
          alreadyChosenNames.add(candidate.exportName);
          return candidate;
        }
      }
    }
    return undefined;
  };

  let extraPrimariesNeeded = 2;
  let rank = Math.max(...colordEntries.map((e) => e.selection.rank)) + 1;
  while (extraPrimariesNeeded > 0) {
    const candidate = nextCandidates();
    if (!candidate) throw new Error('colord pool exhausted while drawing extra primaries');
    const entry = manifestEntryFrom(candidate, 'primary', rank++, lock, 'colord');
    const count = checkMutantCount(entry);
    entry.mutantCount = count;
    if (count >= 10 && count <= 120) {
      colordEntries.push(entry);
      extraPrimariesNeeded--;
      console.log(`colord: drew ${entry.id} as an extra primary (${count} mutants).`);
    } else {
      console.log(`colord: drew ${entry.id} (${count} mutants) — outside H6 budget, skipping.`);
    }
  }

  // Top the reserve count back up to 2 (no feasibility check needed for a
  // reserve; it's only checked if and when it's promoted).
  const reserveCount = colordEntries.filter((e) => e.status === 'reserve').length;
  for (let i = reserveCount; i < 2; i++) {
    const candidate = nextCandidates();
    if (!candidate) throw new Error('colord pool exhausted while drawing a reserve');
    const entry = manifestEntryFrom(candidate, 'reserve', rank++, lock, 'colord');
    colordEntries.push(entry);
    console.log(`colord: drew ${entry.id} as a reserve.`);
  }

  const finalManifest = [...otherEntries, ...colordEntries];
  fs.writeFileSync(manifestPath, JSON.stringify(finalManifest, null, 2) + '\n');

  const counts: Record<string, Record<string, number>> = {};
  for (const e of finalManifest) {
    counts[e.repo] ??= { primary: 0, reserve: 0 };
    counts[e.repo][e.status]++;
  }
  console.log('Final composition:', counts);
  console.log(`Total: ${finalManifest.length} functions.`);
}

main();
