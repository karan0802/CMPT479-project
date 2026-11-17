// Builds the exact system+user prompt for every primary function from the
// frozen template and the subject snapshot, and writes dataset/raw/<fn-id>/
// request.json *before* any generation happens. This is the pre-registration
// record: the prompt is fixed here and never touched again.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');

// dinero.js's low-level functions are generic over a `calculator` parameter
// whose concrete shape isn't defined anywhere in the function's own file. A
// real developer working in this codebase would know to reach for the
// number-backed implementation one import away; these functions give the
// model the same fact, via a plain relative import, with no comment on test
// quality. Every one of these imports resolves to the same module because
// they all live at the same depth (core/<folder>/<file>.ts).
const CALCULATOR_NOTE_IDS = new Set([
  'din-divide-halfUp',
  'din-allocate-safeAllocate',
  'din-utils-distribute',
  'din-api-toDecimal',
  'din-api-toUnits',
]);
const CALCULATOR_NOTE =
  "\nNote: `calculator` is available as the named export `calculator` from '../../calculator/number' (the default number-backed implementation).\n";

interface ManifestEntry {
  id: string;
  status: string;
  exportName: string;
  importStatement: string;
}

function main() {
  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'dataset/manifest.json'), 'utf8')
  );
  const primaries = manifest.filter((e) => e.status === 'primary');

  const systemText = fs.readFileSync(path.join(ROOT, 'dataset/prompts/v1/system.txt'), 'utf8');
  const userTemplate = fs.readFileSync(path.join(ROOT, 'dataset/prompts/v1/user.template.txt'), 'utf8');

  for (const entry of primaries) {
    const provenance = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'dataset/subjects', entry.id, 'provenance.json'), 'utf8')
    );
    const sourceCode = fs.readFileSync(path.join(ROOT, 'dataset/subjects', entry.id, 'source.ts'), 'utf8');

    let userText = userTemplate
      .replaceAll('{{exportName}}', entry.exportName)
      .replaceAll('{{importStatement}}', entry.importStatement)
      .replaceAll('{{sourcePath}}', provenance.originalPath)
      .replace('{{sourceCode}}', sourceCode.replace(/\n$/, ''));

    if (CALCULATOR_NOTE_IDS.has(entry.id)) {
      userText = userText.replace(
        '- Assume the time zone is UTC.',
        `- Assume the time zone is UTC.${CALCULATOR_NOTE}`
      );
    }

    const fullPrompt = `SYSTEM\n${systemText}\nUSER\n${userText}`;
    const sha256 = crypto.createHash('sha256').update(fullPrompt).digest('hex');

    const outDir = path.join(ROOT, 'dataset/raw', entry.id);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'request.json'),
      JSON.stringify(
        {
          functionId: entry.id,
          promptVersion: 'v1',
          system: systemText,
          user: userText,
          sha256,
        },
        null,
        2
      ) + '\n'
    );
  }

  console.log(`Wrote ${primaries.length} request.json files to dataset/raw/`);
}

main();
