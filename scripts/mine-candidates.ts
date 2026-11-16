// Walks each pinned library's source with the TypeScript compiler API and
// writes one row per exported function to dataset/candidates.csv.
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

interface RepoConfig {
  repo: string;
  sourceRoot: string;
  exclude: RegExp[];
}

const REPOS: RepoConfig[] = [
  {
    repo: 'dinero.js',
    sourceRoot: path.join(ROOT, 'upstream/dinero.js/packages/dinero.js/src'),
    exclude: [/__tests__/, /\.test\.ts$/, /\.generated\.test\.ts$/, /^index\.ts$/],
  },
  {
    repo: 'colord',
    sourceRoot: path.join(ROOT, 'harness/extracted/colord/src'),
    exclude: [/\.test\.ts$/, /\.generated\.test\.ts$/, /^index\.ts$/, /^types\.ts$/, /^constants\.ts$/],
  },
  {
    repo: 'ibantools',
    sourceRoot: path.join(ROOT, 'harness/extracted/ibantools'),
    exclude: [/\.test\.ts$/, /\.generated\.test\.ts$/, /\.d\.ts$/],
  },
];

const IMPURITY_PATTERNS: [string, RegExp][] = [
  ['Math.random', /\bMath\.random\b/],
  ['Date.now', /\bDate\.now\b/],
  ['new Date()', /new Date\(\s*\)/],
  ['performance.now', /\bperformance\.now\b/],
  ['setTimeout/setInterval', /\bset(Timeout|Interval)\b/],
  ['process.', /\bprocess\./],
  ['fetch', /\bfetch\(/],
  ['fs', /\bfrom\s+['"]fs['"]|\brequire\(['"]fs['"]\)/],
  ['console.', /\bconsole\./],
  ['localStorage', /\blocalStorage\b/],
  ['Intl.', /\bIntl\./],
  ['toLocaleString', /\btoLocaleString\b/],
  ['this', /\bthis\b/],
];

interface Candidate {
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

function listFiles(dir: string, exclude: RegExp[]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...listFiles(full, exclude));
    } else if (entry.name.endsWith('.ts')) {
      if (exclude.some((re) => re.test(entry.name) || re.test(full))) continue;
      out.push(full);
    }
  }
  return out;
}

interface ImportBinding {
  spec: string;
  internal: boolean;
}

// Maps each imported local name (e.g. `greaterThan`) to the module it came
// from, so usage can be checked per-function rather than per-file.
function fileImportBindings(sourceFile: ts.SourceFile): Map<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();
  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const spec = node.moduleSpecifier.text;
    const internal = spec.startsWith('.');
    const clause = node.importClause;
    if (!clause) return;
    if (clause.name) bindings.set(clause.name.text, { spec, internal });
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) {
        bindings.set(el.name.text, { spec, internal });
      }
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      bindings.set(clause.namedBindings.name.text, { spec, internal });
    }
  });
  return bindings;
}

// Of all the file's imports, which ones does this specific function's text
// actually reference. A crude but function-scoped proxy for H3 (at most 3
// internal imports), rather than counting every import in the whole file.
function importsUsedIn(
  text: string,
  bindings: Map<string, ImportBinding>
): { internal: string[]; external: string[] } {
  const internal = new Set<string>();
  const external = new Set<string>();
  for (const [name, binding] of bindings) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      (binding.internal ? internal : external).add(binding.spec);
    }
  }
  return { internal: [...internal], external: [...external] };
}

function countLoc(text: string): number {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('*') && l !== '/**' && l !== '*/').length;
}

function countBranches(node: ts.Node): number {
  let count = 0;
  const visit = (n: ts.Node) => {
    if (ts.isIfStatement(n) || ts.isConditionalExpression(n) || ts.isCaseClause(n)) {
      count++;
    }
    if (
      ts.isBinaryExpression(n) &&
      (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        n.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      count++;
    }
    n.forEachChild(visit);
  };
  node.forEachChild(visit);
  return count;
}

function isDelegatesOnly(body: ts.ConciseBody | undefined): boolean {
  if (!body) return false;
  if (!ts.isBlock(body)) {
    // Arrow function with an expression body: `(...) => otherFn(...)`.
    return ts.isCallExpression(body);
  }
  return isDelegatesOnlyBlock(body);
}

function category(sourcePath: string, sourceRoot: string): string {
  const rel = path.relative(sourceRoot, sourcePath);
  const dir = path.dirname(rel);
  return dir === '.' ? 'core' : dir;
}

function detectImpurity(text: string): string[] {
  return IMPURITY_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

function mineFile(
  filePath: string,
  sourceRoot: string,
  repo: string,
  testCorpus: string
): Candidate[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bindings = fileImportBindings(sourceFile);
  const sourcePath = path.relative(ROOT, filePath);
  const candidates: Candidate[] = [];

  // Function declarations: `export function name(...) {}`, including overload groups.
  const byName = new Map<string, ts.FunctionDeclaration[]>();
  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      const list = byName.get(node.name.text) ?? [];
      list.push(node);
      byName.set(node.name.text, list);
    }
  });

  for (const [name, decls] of byName) {
    const impl = decls.find((d) => d.body);
    if (!impl || !impl.body) continue;
    const hasOverloads = decls.length > 1;
    const start = sourceFile.getLineAndCharacterOfPosition(impl.getStart(sourceFile)).line + 1;
    const end = sourceFile.getLineAndCharacterOfPosition(impl.getEnd()).line + 1;
    const bodyText = impl.body.getFullText(sourceFile);
    const { internal, external } = importsUsedIn(bodyText, bindings);
    candidates.push({
      repo,
      sourcePath,
      exportName: name,
      lineStart: start,
      lineEnd: end,
      loc: countLoc(bodyText),
      branchCount: countBranches(impl.body),
      paramCount: impl.parameters.length,
      hasOverloads,
      internalImports: internal,
      externalImports: external,
      impurityFlags: detectImpurity(bodyText),
      delegatesOnly: isDelegatesOnlyBlock(impl.body),
      hasUpstreamTest: wordBoundaryIncludes(testCorpus, name),
      category: category(filePath, sourceRoot),
    });
  }

  // Exported const arrow/function expressions: `export const name = (...) => {...}`.
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node) || !hasExportModifier(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const init = decl.initializer;
      if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) continue;

      const start = sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile)).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(decl.getEnd()).line + 1;
      const bodyText = init.body.getFullText(sourceFile);
      const { internal, external } = importsUsedIn(bodyText, bindings);
      candidates.push({
        repo,
        sourcePath,
        exportName: decl.name.text,
        lineStart: start,
        lineEnd: end,
        loc: countLoc(bodyText),
        branchCount: countBranches(init.body),
        paramCount: init.parameters.length,
        hasOverloads: false,
        internalImports: internal,
        externalImports: external,
        impurityFlags: detectImpurity(bodyText),
        delegatesOnly: isDelegatesOnly(init.body),
        hasUpstreamTest: wordBoundaryIncludes(testCorpus, decl.name.text),
        category: category(filePath, sourceRoot),
      });
    }
  });

  return candidates;
}

function isDelegatesOnlyBlock(body: ts.Block): boolean {
  const statements = body.statements;
  if (statements.length === 0) return false;
  const last = statements[statements.length - 1];
  if (!ts.isReturnStatement(last) || !last.expression || !ts.isCallExpression(last.expression)) {
    return false;
  }
  // Everything before the final `return someCall(...)` must just be plain
  // variable setup (destructuring, currying), not control flow of its own.
  return statements.slice(0, -1).every((s) => ts.isVariableStatement(s));
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function wordBoundaryIncludes(corpus: string, name: string): boolean {
  if (!corpus) return false;
  return new RegExp(`\\b${name}\\b`).test(corpus);
}

function buildTestCorpus(sourceRoot: string): string {
  let corpus = '';
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.test\.ts$/.test(entry.name) && !/\.generated\.test\.ts$/.test(entry.name)) {
        corpus += fs.readFileSync(full, 'utf8') + '\n';
      }
    }
  };
  if (fs.existsSync(sourceRoot)) walk(sourceRoot);
  return corpus;
}

function toCsvField(value: unknown): string {
  const str = Array.isArray(value) ? value.join(';') : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function main() {
  const allCandidates: Candidate[] = [];

  for (const repoConfig of REPOS) {
    const files = listFiles(repoConfig.sourceRoot, repoConfig.exclude);
    const testCorpus = buildTestCorpus(repoConfig.sourceRoot);
    for (const file of files) {
      allCandidates.push(...mineFile(file, repoConfig.sourceRoot, repoConfig.repo, testCorpus));
    }
  }

  const columns: (keyof Candidate)[] = [
    'repo',
    'sourcePath',
    'exportName',
    'lineStart',
    'lineEnd',
    'loc',
    'branchCount',
    'paramCount',
    'hasOverloads',
    'internalImports',
    'externalImports',
    'impurityFlags',
    'delegatesOnly',
    'hasUpstreamTest',
    'category',
  ];

  const lines = [columns.join(',')];
  for (const c of allCandidates) {
    lines.push(columns.map((col) => toCsvField(c[col])).join(','));
  }

  const outPath = path.join(ROOT, 'dataset/candidates.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n');

  console.log(`Mined ${allCandidates.length} candidate functions across ${REPOS.length} repos.`);
  for (const repoConfig of REPOS) {
    const count = allCandidates.filter((c) => c.repo === repoConfig.repo).length;
    console.log(`  ${repoConfig.repo}: ${count}`);
  }
}

main();
