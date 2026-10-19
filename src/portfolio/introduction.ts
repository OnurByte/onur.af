import configuration from '../content/introduction.json' with { type: 'json' };
import { getLogEntryById, logMetadata } from './log';

const entry = getLogEntryById(configuration.logId);
if (!entry) throw new Error('Home introduction Log entry is missing');
export const introductionEntry = entry;
const revision = entry.revisions.at(-1)!;
export const introduction = {
  heading: logMetadata(entry).title,
  paragraphs: revision.body.trim().split(/\n\s*\n/),
};
