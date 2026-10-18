import pages from '../content/public-pages.json' with { type: 'json' };
import { logEntries, logProofUrl, logUrl, logMetadata } from './log';

export const socialImageVersion = '5';

export const mottos = [
  'The creator originates.',
  'I am. I think. I will.',
  'To think is an act of choice.',
] as const;

const truncateDescription = (value: string) => {
  const characters = Array.from(value);
  return characters.length <= 160
    ? value
    : `${characters.slice(0, 159).join('')}…`;
};

function logPreview(entry: (typeof logEntries)[number], verified = false) {
  return {
    id: verified ? logProofUrl(entry) : logUrl(entry),
    key: `${verified ? 'verified' : 'log'}-${entry.id}`,
    title: verified
      ? `${logMetadata(entry).title} · Verified`
      : logMetadata(entry).title,
    description: truncateDescription(
      verified
        ? `PGP-verified Log revision. ${logMetadata(entry).summary}`
        : logMetadata(entry).summary,
    ),
  };
}

export function publicPreview(pathname: string) {
  const page = pages.find((page) => page.id === pathname);
  if (page) return page.id === '/' ? { ...page, description: '' } : page;
  const entry = logEntries.find((entry) => logUrl(entry) === pathname);
  if (entry) return logPreview(entry);
  const verifiedEntry = logEntries.find(
    (entry) => logProofUrl(entry) === pathname,
  );
  return verifiedEntry ? logPreview(verifiedEntry, true) : undefined;
}

export function publicPreviewByKey(key: string) {
  const page = pages.find((page) => page.key === key);
  if (page) return page.id === '/' ? { ...page, description: '' } : page;
  const entry = logEntries.find((entry) => `log-${entry.id}` === key);
  if (entry) return logPreview(entry);
  const verifiedEntry = logEntries.find(
    (entry) => `verified-${entry.id}` === key,
  );
  return verifiedEntry ? logPreview(verifiedEntry, true) : undefined;
}
