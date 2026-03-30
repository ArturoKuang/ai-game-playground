import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resultsPath = path.join(rootDir, 'results.tsv');
const header = 'commit\tscore\tselected_game\tstatus\tdescription\n';

try {
  await access(resultsPath);
  console.log('results.tsv already exists');
} catch {
  await writeFile(resultsPath, header, 'utf8');
  console.log('Created results.tsv');
}
