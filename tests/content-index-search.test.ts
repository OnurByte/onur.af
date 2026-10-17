import { expect, test } from 'bun:test';
import { logSearchEntries } from '../src/portfolio/search';

test('Find includes source titles and normalized GitHub repository references', () => {
  const [document] = logSearchEntries([
    {
      id: 'quiet-river-flows',
      title: 'Decisions',
      summary: 'Notes',
      revisions: [
        {
          version: 1,
          publishedAt: '2026-10-17T00:00:00Z',
          tags: ['development'],
          body:
            '[implementation](https://github.com/OnurByte/Portfolio/commit/' +
            'a'.repeat(40) +
            ')',
          sources: [
            {
              title: 'Architecture reference',
              url: 'https://example.com/paper',
            },
          ],
        },
      ],
    },
  ]);
  expect(document!.searchText).toContain('onurbyte/portfolio');
  expect(document!.searchText).toContain('Architecture reference');
});
