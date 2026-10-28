import pages from '../content/public-pages.json' with { type: 'json' };
import { logEntries, logProofUrl, logUrl, logMetadata } from './log';

const socialImageVersion = '8';

const identityPreviews = [
  {
    id: '/pgp/x',
    key: 'pgp-x',
    title: 'X ⁜ PGP',
    description: 'X verified by PGP.',
  },
  {
    id: '/pgp/github',
    key: 'pgp-github',
    title: 'GitHub ⁜ PGP',
    description: 'GitHub verified by PGP.',
  },
];
const previewPages = [...pages, ...identityPreviews];

export const mottos = [
  'The creator originates.',
  'I am. I think. I will.',
  'To think is an act of choice.',
] as const;

export function nextMottoIndex(
  previous: number | undefined,
  random = Math.random(),
): number {
  const valid =
    previous !== undefined &&
    Number.isInteger(previous) &&
    previous >= 0 &&
    previous < mottos.length;
  const candidate = Math.floor(random * (mottos.length - (valid ? 1 : 0)));
  return valid && candidate >= previous ? candidate + 1 : candidate;
}

const truncateDescription = (value: string) => {
  const characters = Array.from(value);
  return characters.length <= 160
    ? value
    : `${characters.slice(0, 159).join('')}…`;
};

function logPreview(
  entry: (typeof logEntries)[number],
  verified = false,
  version = entry.revisions.at(-1)?.version,
) {
  if (!entry.revisions.some((revision) => revision.version === version)) return;
  const metadata = logMetadata(entry, version);
  return {
    id: verified ? logProofUrl(entry) : logUrl(entry),
    key: `${verified ? 'verified' : 'log'}-${entry.id}`,
    title: verified ? `${metadata.title} ⁜ Verified` : metadata.title,
    revision: version,
    description: truncateDescription(
      verified
        ? `PGP-verified Log revision ${String(version)}. ${metadata.summary}`
        : metadata.summary,
    ),
  };
}

export function publicPreview(pathname: string, version?: number) {
  const page = previewPages.find((page) => page.id === pathname);
  if (page) return page;
  const entry = logEntries.find((entry) => logUrl(entry) === pathname);
  if (entry) return logPreview(entry, false, version);
  const verifiedEntry = logEntries.find(
    (entry) => logProofUrl(entry) === pathname,
  );
  return verifiedEntry ? logPreview(verifiedEntry, true, version) : undefined;
}

export function publicPreviewByKey(key: string, version?: number) {
  const page = previewPages.find((page) => page.key === key);
  if (page) return page;
  const entry = logEntries.find((entry) => `log-${entry.id}` === key);
  if (entry) return logPreview(entry, false, version);
  const verifiedEntry = logEntries.find(
    (entry) => `verified-${entry.id}` === key,
  );
  return verifiedEntry ? logPreview(verifiedEntry, true, version) : undefined;
}

/** The visible home motto can vary; crawler-facing preview identity stays stable. */
export function socialPreviewUrl(
  origin: string,
  preview: NonNullable<ReturnType<typeof publicPreview>>,
) {
  const url = new URL(`/social/${preview.key}.png`, origin);
  url.searchParams.set('v', socialImageVersion);
  if ('revision' in preview)
    url.searchParams.set('r', String(preview.revision));
  return url.href;
}
