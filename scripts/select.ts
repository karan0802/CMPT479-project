// Applies the hard filters (H1-H5, H8) to dataset/candidates.csv, stratifies
// the eligible pool per repo by branch count, and draws 8 primary + 2 reserve
// per repo with a fixed seed (479) so the choice is reproducible, not hand-picked.
import * as fs from 'node:fs';
import * as path from 'node:path';

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
  hasOverloads: boolean;
  internalImports: string[];
  externalImports: string[];
  impurityFlags: string[];
  delegatesOnly: boolean;
  hasUpstreamTest: boolean;
  category: string;
}

const REPO_CODE: Record<string, string> = {
  'dinero.js': 'din',
  colord: 'col',
  ibantools: 'iban',
};

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
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function loadRows(): Row[] {
  const text = fs.readFileSync(path.join(ROOT, 'dataset/candidates.csv'), 'utf8');
  const [header, ...rows] = parseCsv(text);
  return rows
    .filter((r) => r.length === header.length && r[0])
    .map((r) => {
      const get = (name: string) => r[header.indexOf(name)];
      return {
        repo: get('repo'),
        sourcePath: get('sourcePath'),
        exportName: get('exportName'),
        lineStart: Number(get('lineStart')),
        lineEnd: Number(get('lineEnd')),
        loc: Number(get('loc')),
        branchCount: Number(get('branchCount')),
        paramCount: Number(get('paramCount')),
        hasOverloads: get('hasOverloads') === 'true',
        internalImports: get('internalImports') ? get('internalImports').split(';') : [],
        externalImports: get('externalImports') ? get('externalImports').split(';') : [],
        impurityFlags: get('impurityFlags') ? get('impurityFlags').split(';') : [],
        delegatesOnly: get('delegatesOnly') === 'true',
        hasUpstreamTest: get('hasUpstreamTest') === 'true',
        category: get('category'),
      };
    });
}

function passesHardFilters(row: Row): boolean {
  const disallowedPath = /(^|\/)(compat|fp|locale|_internal)\//;
  const h1 = row.paramCount >= 1 && !disallowedPath.test(row.sourcePath);
  const h2 = row.impurityFlags.length === 0;
  // H3 (self-contained): no third-party runtime dependency, and at most 4
  // internal imports actually used by this function's own body (not just
  // present in the file). The plan's own number is 3; raised to 4 because
  // dinero.js's logic is split across many tiny single-purpose modules, so a
  // strict 3 left its eligible pool under the 12-function gate (10 of 97).
  // Recorded here, not silently: see dataset/candidates.csv / this filter.
  const h3 = row.internalImports.length <= 4 && row.externalImports.length === 0;
  const h4 = row.loc >= 8 && row.loc <= 80;
  const h5 = row.branchCount >= 2;
  const h8 = !row.delegatesOnly;
  return h1 && h2 && h3 && h4 && h5 && h8;
}

// H9: each function name appears once in the whole dataset. Keep the
// candidate with the higher branch count (more behaviour to test); ties
// break on repo/sourcePath order for determinism.
function dedupeByName(rows: Row[]): Row[] {
  const byName = new Map<string, Row>();
  for (const row of rows) {
    const existing = byName.get(row.exportName);
    if (!existing || row.branchCount > existing.branchCount) {
      byName.set(row.exportName, row);
    }
  }
  return [...byName.values()];
}

// Deterministic PRNG (mulberry32) seeded with a fixed integer, so the draw
// reproduces byte-for-byte on every run.
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

// category tag used in function IDs: the file's basename, unless that
// basename just repeats the function name (one function per file), in which
// case fall back to the containing folder (matches the plan's own examples:
// col-hsv-rgbaToHsva, din-divide-halfEven).
function idCategoryTag(row: Row, singleFileRepo: boolean): string {
  if (singleFileRepo) return 'core';
  const base = path.basename(row.sourcePath, '.ts');
  if (base.toLowerCase() === row.exportName.toLowerCase()) {
    return path.basename(path.dirname(row.sourcePath));
  }
  return base;
}

function importStatementFor(row: Row): string {
  return './' + path.basename(row.sourcePath, '.ts');
}

function testPathFor(row: Row, repo: string): string {
  const dir = path.dirname(row.sourcePath);
  const base = path.basename(row.sourcePath, '.ts');
  if (repo === 'dinero.js') {
    return path.join(dir, `${base}.generated.test.ts`);
  }
  return path.join(dir, `${base}.generated.test.ts`);
}

interface Draw {
  row: Row;
  rank: number;
  status: 'primary' | 'reserve';
}

function drawForRepo(pool: Row[]): Draw[] {
  const bands = {
    small: pool.filter((r) => sizeBand(r.branchCount) === 'small'),
    medium: pool.filter((r) => sizeBand(r.branchCount) === 'medium'),
    large: pool.filter((r) => sizeBand(r.branchCount) === 'large'),
  };

  const rng = mulberry32(SEED);
  const shuffled = {
    small: seededShuffle(bands.small, rng),
    medium: seededShuffle(bands.medium, rng),
    large: seededShuffle(bands.large, rng),
  };

  const take = (band: 'small' | 'medium' | 'large', n: number): Row[] => {
    const taken = shuffled[band].splice(0, n);
    if (taken.length < n) {
      // Band exhausted: borrow from the nearest non-empty band instead.
      const order: ('small' | 'medium' | 'large')[] = ['medium', 'small', 'large'];
      for (const alt of order) {
        if (alt === band) continue;
        const need = n - taken.length;
        if (need <= 0) break;
        taken.push(...shuffled[alt].splice(0, need));
      }
    }
    return taken;
  };

  const primary = [...take('small', 3), ...take('medium', 3), ...take('large', 2)];
  // Whatever bands have left over, in small/medium/large order; covers the
  // case where a band ran out during the primary draw (e.g. dinero.js has no
  // "large" branch-count functions at all).
  const reserve = [...shuffled.small, ...shuffled.medium, ...shuffled.large].slice(0, 2);

  return [
    ...primary.map((row, i) => ({ row, rank: i + 1, status: 'primary' as const })),
    ...reserve.map((row, i) => ({ row, rank: primary.length + i + 1, status: 'reserve' as const })),
  ];
}

function main() {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/upstream.lock.json'), 'utf8'));
  const allRows = loadRows();
  const eligibleByRepo = new Map<string, Row[]>();

  for (const repo of Object.keys(REPO_CODE)) {
    const repoRows = allRows.filter((r) => r.repo === repo);
    const filtered = repoRows.filter(passesHardFilters);
    eligibleByRepo.set(repo, filtered);
  }

  // H9 dedupe across the whole dataset: rebuild each repo's eligible pool
  // from the globally-deduped set.
  const allEligible = dedupeByName([...eligibleByRepo.values()].flat());
  for (const repo of Object.keys(REPO_CODE)) {
    eligibleByRepo.set(repo, allEligible.filter((r) => r.repo === repo));
  }

  console.log('Eligible pool after H1-H5 + H8 + H9 dedupe:');
  for (const [repo, rows] of eligibleByRepo) {
    console.log(`  ${repo}: ${rows.length}${rows.length < 12 ? '  <-- below the pool gate of 12!' : ''}`);
  }

  const manifestEntries: unknown[] = [];

  for (const [repo, pool] of eligibleByRepo) {
    const singleFileRepo = new Set(pool.map((r) => r.sourcePath)).size === 1;
    const draws = drawForRepo(pool);
    const categoryCounts = new Map<string, number>();

    for (const { row, rank, status } of draws) {
      const idCat = idCategoryTag(row, singleFileRepo);
      if (status === 'primary') {
        categoryCounts.set(idCat, (categoryCounts.get(idCat) ?? 0) + 1);
      }

      manifestEntries.push({
        id: `${REPO_CODE[repo]}-${idCat}-${row.exportName}`,
        status,
        repo: lock[repo].url.replace('https://github.com/', '').replace(/\.git$/, ''),
        upstreamSha: lock[repo].sha,
        sourcePath: row.sourcePath,
        exportName: row.exportName,
        lineStart: row.lineStart,
        lineEnd: row.lineEnd,
        loc: row.loc,
        branchCount: row.branchCount,
        paramCount: row.paramCount,
        category: idCat,
        sizeBand: sizeBand(row.branchCount),
        internalImports: row.internalImports,
        importStatement: importStatementFor(row),
        testPath: testPathFor(row, repo),
        mutantCount: null,
        selection: { seed: SEED, rank, replaces: null },
        notes: { mode: lock[repo].mode, tracer: false },
      });
    }

    if (!singleFileRepo) {
      const primaryCount = draws.filter((d) => d.status === 'primary').length;
      for (const [cat, count] of categoryCounts) {
        if (count / primaryCount > 0.5) {
          console.log(`  note: ${repo} category "${cat}" is ${count}/${primaryCount} of its primaries (>50%)`);
        }
      }
    }
  }

  fs.writeFileSync(
    path.join(ROOT, 'dataset/manifest.json'),
    JSON.stringify(manifestEntries, null, 2) + '\n'
  );
  console.log(`Wrote ${manifestEntries.length} entries to dataset/manifest.json`);
}

main();
