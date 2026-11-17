// Walks every frozen generated test file with the TypeScript compiler API
// and writes one row per test case (it/test block) to dataset/test-cases.json
// — the join table Stage 2 warnings, Stage 3 mutation results and Stage 4
// labels all attach to via its stable `<fn-id>:T<nn>` id.
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

interface ManifestEntry {
  id: string;
  status: string;
}

interface TestCase {
  id: string;
  fnId: string;
  file: string;
  describePath: string[];
  title: string;
  startLine: number;
  endLine: number;
  parametrized: boolean;
  assertionCount: number;
  expectChains: { line: number; chain: string }[];
  status: 'active';
}

function isDescribeOrItCall(node: ts.Node, names: string[]): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  let callee = node.expression;
  // Unwrap `it.each(...)()` / `describe.skip(...)` style property access.
  if (ts.isPropertyAccessExpression(callee)) callee = callee.expression;
  return ts.isIdentifier(callee) && names.includes(callee.text);
}

function calleeName(node: ts.CallExpression): string {
  return ts.isPropertyAccessExpression(node.expression) ? (node.expression.expression as ts.Identifier).text : (node.expression as ts.Identifier).text;
}

function isParametrized(node: ts.CallExpression): boolean {
  return ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'each';
}

function stringArg(node: ts.CallExpression): string {
  const arg = node.arguments[0];
  if (arg && ts.isStringLiteralLike(arg)) return arg.text;
  return arg ? arg.getText() : '';
}

function findExpectChains(node: ts.Node, sourceFile: ts.SourceFile): { line: number; chain: string }[] {
  const chains: { line: number; chain: string }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      // Walk to the root of a chain like expect(x).not.toEqual(y) -> "expect().not.toEqual"
      let base: ts.Expression = n.expression;
      const parts: string[] = [];
      while (ts.isPropertyAccessExpression(base)) {
        parts.unshift(base.name.text);
        base = base.expression;
      }
      if (ts.isCallExpression(base) && ts.isIdentifier(base.expression) && base.expression.text === 'expect') {
        const line = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile)).line + 1;
        chains.push({ line, chain: `expect().${parts.join('.')}` });
      }
    }
    n.forEachChild(visit);
  };
  node.forEachChild(visit);
  return chains;
}

function walkDescribe(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  describePath: string[],
  fnId: string,
  filePath: string,
  counter: { n: number },
  out: TestCase[]
) {
  node.forEachChild((child) => {
    if (isDescribeOrItCall(child, ['describe'])) {
      const title = stringArg(child);
      const body = child.arguments[1];
      if (body && (ts.isArrowFunction(body) || ts.isFunctionExpression(body))) {
        walkDescribe(body.body, sourceFile, [...describePath, title], fnId, filePath, counter, out);
      }
      return;
    }
    if (isDescribeOrItCall(child, ['it', 'test'])) {
      counter.n++;
      const start = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(child.getEnd()).line + 1;
      const body = child.arguments[isParametrized(child) ? 2 : 1];
      const expectChains = body ? findExpectChains(body, sourceFile) : [];
      out.push({
        id: `${fnId}:T${String(counter.n).padStart(2, '0')}`,
        fnId,
        file: filePath,
        describePath,
        title: stringArg(child),
        startLine: start,
        endLine: end,
        parametrized: isParametrized(child),
        assertionCount: expectChains.length,
        expectChains,
        status: 'active',
      });
      return;
    }
    walkDescribe(child, sourceFile, describePath, fnId, filePath, counter, out);
  });
}

function main() {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8'));
  const primaries = manifest.filter((e) => e.status === 'primary');
  const allCases: TestCase[] = [];

  for (const entry of primaries) {
    const genDir = path.join(ROOT, 'dataset/generated', entry.id);
    const fileName = fs.readdirSync(genDir).find((f) => f.endsWith('.generated.test.ts'))!;
    const absPath = path.join(genDir, fileName);
    const relPath = path.relative(ROOT, absPath);
    const text = fs.readFileSync(absPath, 'utf8');
    const sourceFile = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const cases: TestCase[] = [];
    walkDescribe(sourceFile, sourceFile, [], entry.id, relPath, { n: 0 }, cases);
    allCases.push(...cases);
  }

  fs.writeFileSync(path.join(ROOT, 'dataset/test-cases.json'), JSON.stringify(allCases, null, 2) + '\n');
  console.log(`Extracted ${allCases.length} test cases across ${primaries.length} functions.`);
}

main();
