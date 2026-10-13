import { rm } from 'node:fs/promises';
import * as pagefind from 'pagefind';
import { searchPages } from '../src/portfolio/search';

function checkErrors(errors: string[]) {
  if (errors.length) throw new Error(errors.join('\n'));
}

try {
  const { index, errors } = await pagefind.createIndex();
  checkErrors(errors);
  if (!index) throw new Error('Pagefind did not create an index');
  for (const page of searchPages) {
    const result = await index.addCustomRecord(page);
    checkErrors(result.errors);
  }
  await rm('public/pagefind', { recursive: true, force: true });
  const result = await index.writeFiles({ outputPath: 'public/pagefind' });
  checkErrors(result.errors);
  console.log(`Indexed ${searchPages.length} public page descriptions.`);
} finally {
  await pagefind.close();
}
