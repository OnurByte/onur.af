import { structuredPatch } from 'diff';
import { revisionMarkdown, type LogEntry } from './log';

/** Compare exact signed Markdown, including revision metadata, with three context lines. */
export function logRevisionDiff(entry: LogEntry, version: number) {
  if (!entry.revisions.some((revision) => revision.version === version))
    throw new Error('Unknown Log revision');
  const hunks =
    version === 1
      ? []
      : structuredPatch(
          `v${version - 1}`,
          `v${version}`,
          revisionMarkdown(entry, version - 1),
          revisionMarkdown(entry, version),
          undefined,
          undefined,
          { context: 3 },
        ).hunks;
  const lines = hunks.flatMap((hunk) => hunk.lines);
  return {
    hunks,
    added: lines.filter((line) => line.startsWith('+')).length,
    removed: lines.filter((line) => line.startsWith('-')).length,
  };
}
