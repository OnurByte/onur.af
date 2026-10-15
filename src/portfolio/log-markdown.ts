import { micromark } from 'micromark';
// micromark escapes raw HTML and rejects dangerous link protocols by default.
export const renderLogMarkdown = (body: string): string => micromark(body);
