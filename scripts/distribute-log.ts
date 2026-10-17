import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { withDistributionLock } from '../src/portfolio/distribution-store';
import { publicRequest } from '../src/portfolio/public-request';
import { resolve } from 'node:path';
import {
  getLogEntryById,
  logUrl,
  logRevisionUrl,
  revisionMarkdown,
} from '../src/portfolio/log';
import { buildContentIndex } from '../src/portfolio/content-index';
import { siteOrigin } from '../src/portfolio/seo';
import {
  deliverWebmentions,
  parseDeliveryReceipts,
  type DeliveryReceipt,
} from '../src/portfolio/webmention';

const [id, flag, ...extra] = process.argv.slice(2);
const entry = getLogEntryById(id);
const origin = siteOrigin();
if (
  !entry ||
  !origin ||
  extra.length ||
  (flag !== undefined && flag !== '--send')
)
  throw new Error(
    'Usage: SITE_URL=https://your.site bun run log:distribute <slug> [--send]',
  );
const document = buildContentIndex([entry], origin).documents[0]!;
const targets = document.externalLinks;
if (flag !== '--send') {
  console.log(
    JSON.stringify(
      {
        source: new URL(logUrl(entry), origin).href,
        version: document.version,
        targets,
        mode: 'preview; pass --send after deployment',
      },
      null,
      2,
    ),
  );
} else {
  const path = resolve(
    process.env['PORTFOLIO_DISTRIBUTION_STORE'] ??
      '.local/log-distribution.json',
  );
  await withDistributionLock(path, async () => {
    let previous: DeliveryReceipt[] = [];
    try {
      previous = parseDeliveryReceipts(await readJsonFile(path));
    } catch (error) {
      if (!(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
    }
    const source = new URL(logUrl(entry), origin).href;
    const receipts = await deliverWebmentions(
      {
        source,
        version: document.version,
        revisionUrl: new URL(logRevisionUrl(entry, document.version), origin)
          .href,
        markdown: revisionMarkdown(entry, document.version),
        targets,
      },
      previous,
      publicRequest,
      async (receipt) => {
        previous = previous.filter(
          (item) =>
            !(
              item.source === receipt.source &&
              item.target === receipt.target &&
              item.sha256 === receipt.sha256
            ),
        );
        previous.push(receipt);
        await writeJsonFile(path, previous);
      },
    );
    for (const receipt of receipts)
      console.log(
        `${receipt.status}: ${receipt.target}${receipt.error ? ` (${receipt.error})` : ''}`,
      );
    if (receipts.some((receipt) => receipt.status === 'failed'))
      process.exitCode = 1;
  });
}
