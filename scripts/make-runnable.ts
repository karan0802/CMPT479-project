// For every loadable suite, writes a runnable copy where each test case that
// failed or was flaky in validation is rewritten from it(...) to it.skip(...)
// — an AST transform, nothing else touched. The originals in dataset/generated
// are never edited. A suite that doesn't load gets no runnable copy at all.
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
  describePath: string[];
  title: string;
  status: string;
}

function fullNameOf(tc: TestCase): string {
  return [...tc.describePath, tc.title].join(' ');
}

function isItOrTestCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === 'it' || callee.text === 'test';
  // it.skip, it.only, test.each, etc. - still an it/test call, just decorated.
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return callee.expression.text === 'it' || callee.expression.text === 'test';
  }
  return false;
}

function titleOf(node: ts.CallExpression): string {
  const arg = node.arguments[0];
  return arg && ts.isStringLiteralLike(arg) ? arg.text : '';
}

function quarantineFile(sourceText: string, quarantinedTitles: Set<string>): string {
  const sourceFile = ts.createSourceFile('x.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits: { start: number; end: number }[] = [];

  const describeStack: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'describe') {
      const arg = node.arguments[0];
      describeStack.push(arg && ts.isStringLiteralLike(arg) ? arg.text : '');
      node.forEachChild(visit);
      describeStack.pop();
      return;
    }
    if (isItOrTestCall(node)) {
      const fullName = [...describeStack, titleOf(node)].join(' ');
      if (quarantinedTitles.has(fullName)) {
        // Replace just the callee identifier (`it` or `test`) with `it.skip`
        // / `test.skip`, leaving everything else byte-identical.
        const callee = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : node.expression;
        edits.push({ start: callee.getStart(sourceFile), end: callee.getEnd() });
      }
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);

  // Apply edits back-to-front so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let result = sourceText;
  for (const { start, end } of edits) {
    const original = result.slice(start, end);
    result = result.slice(0, start) + `${original}.skip` + result.slice(end);
  }
  return result;
}

function main() {
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8'));
  const primaries = manifest.filter((e) => e.status === 'primary');
  const testCases: TestCase[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset/test-cases.json'), 'utf8'));

  let totalQuarantined = 0;

  for (const entry of primaries) {
    const validation = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'dataset/validation', `${entry.id}.json`), 'utf8')
    );

    if (!validation.loads) {
      console.log(`${entry.id}: not loadable, no runnable copy`);
      continue;
    }

    const quarantined: { testId: string; fullName: string; reason: string; failureMessage: string }[] = [];
    const quarantinedTitles = new Set<string>();

    for (const [fullName, info] of Object.entries(validation.perTest) as [string, any][]) {
      const failed = info.statuses.includes('failed');
      if (failed || info.flaky) {
        quarantinedTitles.add(fullName);
        const tc = testCases.find((t) => t.fnId === entry.id && fullNameOf(t) === fullName);
        quarantined.push({
          testId: tc?.id ?? 'unknown',
          fullName,
          reason: info.flaky ? 'flaky' : 'failed',
          failureMessage: info.failureMessages[0] ?? '',
        });
        if (tc) tc.status = 'quarantined';
      }
    }

    const genDir = path.join(ROOT, 'dataset/generated', entry.id);
    const fileName = fs.readdirSync(genDir).find((f) => f.endsWith('.generated.test.ts'))!;
    const sourceText = fs.readFileSync(path.join(genDir, fileName), 'utf8');
    const runnableText = quarantineFile(sourceText, quarantinedTitles);

    const outDir = path.join(ROOT, 'dataset/runnable', entry.id);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, fileName), runnableText);
    fs.writeFileSync(path.join(outDir, 'quarantine.json'), JSON.stringify(quarantined, null, 2) + '\n');

    totalQuarantined += quarantined.length;
    console.log(`${entry.id}: quarantined ${quarantined.length} test case(s)`);
  }

  fs.writeFileSync(path.join(ROOT, 'dataset/test-cases.json'), JSON.stringify(testCases, null, 2) + '\n');
  console.log(`Total quarantined across all suites: ${totalQuarantined}`);
}

main();
