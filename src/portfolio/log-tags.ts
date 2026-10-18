import {
  logEntries,
  logMetadata,
  logTagDefinitions,
  type LogEntry,
} from './log';
export const logTagUrl = (slug: string) => `/log/tag/${slug}`;

// Subject metadata is editorial navigation, independent of signed revisions.
for (const [slug, definition] of Object.entries(logTagDefinitions)) {
  const seen = new Set([slug]);
  let parent = definition.broader;
  for (const target of definition.related ?? []) {
    if (!logTagDefinitions[target] || target === slug)
      throw new Error(`Invalid related subject: ${slug} -> ${target}`);
  }
  while (parent) {
    if (!logTagDefinitions[parent] || seen.has(parent))
      throw new Error(`Invalid subject hierarchy: ${slug}`);
    seen.add(parent);
    parent = logTagDefinitions[parent]!.broader;
  }
}

export function logTags(entries: readonly LogEntry[] = logEntries) {
  return Object.entries(logTagDefinitions).flatMap(([slug, definition]) => {
    const matches = entries.filter((entry) =>
      logMetadata(entry).tags.some((tag) => {
        let subject: string | undefined = tag;
        while (subject) {
          if (subject === slug) return true;
          subject = logTagDefinitions[subject]?.broader;
        }
        return false;
      }),
    );
    return matches.length ? [{ slug, ...definition, entries: matches }] : [];
  });
}
export function logTagIndexable(
  slug: string,
  entries: readonly LogEntry[] = logEntries,
) {
  return logTags(entries).some((tag) => tag.slug === slug && tag.indexable);
}
