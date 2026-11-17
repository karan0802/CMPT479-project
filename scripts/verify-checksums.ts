// Re-checks every file listed in dataset/CHECKSUMS.sha256. Fails loudly if
// anything in the frozen dataset changed by even one byte.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');

function main() {
  const lines = fs.readFileSync(path.join(ROOT, 'dataset/CHECKSUMS.sha256'), 'utf8').trim().split('\n');
  let failed = 0;

  for (const line of lines) {
    const [expected, file] = line.split('  ');
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) {
      console.error(`MISSING: ${file}`);
      failed++;
      continue;
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if (actual !== expected) {
      console.error(`CHANGED: ${file}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`${failed} file(s) failed verification.`);
    process.exit(1);
  }
  console.log(`All ${lines.length} files verified.`);
}

main();
