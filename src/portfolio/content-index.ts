import { listedLogEntries, logMetadata, logUrl, type LogEntry } from './log';
import { renderLogContent } from './log-markdown';

export interface GithubReference {
  repository: string;
  url: string;
  commit?: string;
}

export function githubReference(href: string): GithubReference | undefined {
  try {
    const url = new URL(href);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'github.com' ||
      url.port ||
      url.username ||
      url.password
    )
      return;
    const parts = url.pathname.split('/').filter(Boolean);
    const [owner, rawRepository, kind, ref] = parts;
    if (
      !owner ||
      !rawRepository ||
      !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(owner) ||
      !/^[\w.-]+$/.test(rawRepository)
    )
      return;
    if (
      [
        'settings',
        'features',
        'topics',
        'collections',
        'marketplace',
        'orgs',
        'users',
        'search',
        'sponsors',
        'login',
        'signup',
        'about',
        'site',
        'security',
        'enterprise',
        'organizations',
      ].includes(owner.toLowerCase())
    )
      return;
    const repository = rawRepository.replace(/\.git$/, '');
    if (!repository || repository === '.' || repository === '..') return;
    return {
      repository: `${owner}/${repository}`.toLowerCase(),
      url: url.href,
      ...(['commit', 'blob', 'tree'].includes(kind ?? '') &&
      /^[a-f\d]{40}$/i.test(ref ?? '')
        ? { commit: ref!.toLowerCase() }
        : {}),
    };
  } catch {
    return;
  }
}

export function buildContentIndex(
  entries: readonly LogEntry[],
  origin = 'https://log.invalid',
) {
  const base = new URL(origin).origin;
  const documents = entries.map((entry) => {
    const metadata = logMetadata(entry);
    const revision = entry.revisions.at(-1)!;
    const url = logUrl(entry);
    const links = [
      ...new Set(
        [
          ...renderLogContent(revision.body).links,
          ...metadata.sources.map((source) => source.url),
        ].flatMap((href) => {
          try {
            const target = new URL(href, new URL(url, base));
            return ['http:', 'https:'].includes(target.protocol) &&
              !target.username &&
              !target.password
              ? [target.href]
              : [];
          } catch {
            return [];
          }
        }),
      ),
    ];
    const repositories = links.flatMap((href) => {
      const reference = githubReference(href);
      return reference ? [reference] : [];
    });
    return {
      id: entry.id,
      url,
      ...metadata,
      version: revision.version,
      body: revision.body,
      links,
      externalLinks: links.filter((href) => new URL(href).origin !== base),
      repositories,
    };
  });
  return {
    documents,
    referencedBy(id: string) {
      return documents.filter(
        (document) =>
          document.id !== id &&
          document.links.some((href) => {
            const target = new URL(href);
            return (
              target.origin === base &&
              target.pathname.replace(/\/$/, '') === `/log/${id}`
            );
          }),
      );
    },
    forRepository(repository: string) {
      return documents.filter((document) =>
        document.repositories.some(
          (reference) => reference.repository === repository.toLowerCase(),
        ),
      );
    },
  };
}

export const contentIndex = buildContentIndex(listedLogEntries);
