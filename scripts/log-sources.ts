import { logEntries } from '../src/portfolio/log';
import { sourceUrls, sourceArchives } from '../src/portfolio/source-archives';
const [command, ...extra] = process.argv.slice(2);
if (extra.length || (command !== 'export' && command !== '--check'))
  throw new Error('Usage: bun run sources export | --check');
if (command === 'export')
  console.log(
    [
      ...new Set([
        ...sourceUrls(logEntries),
        ...Object.values(sourceArchives).map((archive) => archive.url),
      ]),
    ].join('\n'),
  );
else
  console.log(
    `Validated ${Object.keys(sourceArchives).length} source archive relationships without modifying signed revisions.`,
  );
