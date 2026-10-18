import { expect, test } from 'bun:test';
import { logProofUrl, parseLog, revisionMarkdown } from '../src/portfolio/log';
import { renderLogMarkdown } from '../src/portfolio/log-markdown';
import { logSearchEntries } from '../src/portfolio/search';
const revision = {
  version: 1,
  publishedAt: '2026-10-16T09:00:00Z',
  tags: ['development'],
  body: 'Text',
};
const entry = {
  id: 'ancient-archive-opens',
  title: 'Original',
  summary: 'Summary',
  revisions: [revision],
};

test('signed metadata belongs to its revision and old bytes stay unchanged', () => {
  const original = revisionMarkdown(parseLog([entry])[0]!, 1);
  const parsed = parseLog([
    {
      ...entry,
      revisions: [
        revision,
        {
          ...revision,
          version: 2,
          publishedAt: '2026-10-17T09:00:00Z',
          title: 'Updated',
          summary: 'New summary',
          language: 'tr',
          tags: ['pgp'],
        },
      ],
    },
  ])[0]!;
  expect(revisionMarkdown(parsed, 1)).toBe(original);
  expect(revisionMarkdown(parsed, 2)).toContain('title: "Updated"');
  expect(revisionMarkdown(parsed, 2)).toContain('tags: ["pgp"]');
  expect(logSearchEntries([parsed])[0]!.searchText).toContain('pgp');
  expect(logSearchEntries([parsed])[0]!.meta.title).toBe('Updated');
});

test('Log proof URLs use the stable verified route and retain revision selection', () => {
  const parsed = parseLog([entry])[0]!;
  expect(logProofUrl(parsed)).toBe('/log/ancient-archive-opens/verified');
  expect(logProofUrl(parsed, 1)).toBe(
    '/log/ancient-archive-opens/verified?v=1',
  );
});

test('legacy revisions without tags retain their exact signed Markdown bytes', () => {
  const legacy = parseLog([
    {
      ...entry,
      revisions: [
        {
          version: 1,
          publishedAt: '2026-10-16T09:00:00Z',
          body: 'Text',
        },
      ],
    },
  ])[0]!;
  expect(revisionMarkdown(legacy, 1)).toBe(
    '---\nid: ancient-archive-opens\ntitle: "Original"\nsummary: "Summary"\nversion: 1\npublished: 2026-10-16T09:00:00Z\nupdated: 2026-10-16T09:00:00Z\n---\n\nText\n',
  );
});

test('rejects duplicate or unknown tags and inaccessible covers', () => {
  for (const tags of [['pgp', 'pgp'], ['not-in-vocabulary']]) {
    expect(() =>
      parseLog([{ ...entry, revisions: [{ ...revision, tags }] }]),
    ).toThrow();
  }
  expect(() =>
    parseLog([
      {
        ...entry,
        revisions: [
          {
            ...revision,
            cover: {
              src: '/media/test.webp',
              alt: '',
              width: 800,
              height: 600,
            },
          },
        ],
      },
    ]),
  ).toThrow();
});

test('renders GFM, footnotes and unique linked headings safely', () => {
  const html = renderLogMarkdown(
    '## Hello\n\n## Hello\n\n~~old~~\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] Done\n\nEvidence[^1]\n\n[^1]: Source',
  );
  expect(html).toContain('<del>old</del>');
  expect(html).toContain('<table>');
  expect(html).toContain('type="checkbox"');
  expect(html).toContain('id="hello"');
  expect(html).toContain('id="hello-1"');
  expect(html).toContain('href="#hello"');
  expect(html).toContain('data-footnote-ref');
  expect(renderLogMarkdown('<script>alert(1)</script>')).not.toContain(
    '<script>',
  );
});

test('validates image sources and adds loading hints, including reference images', () => {
  expect(() => renderLogMarkdown('![](https://example.com/chart.png)')).toThrow(
    'alt',
  );
  expect(() => renderLogMarkdown('![Chart](javascript:alert)')).toThrow();
  expect(
    renderLogMarkdown('![Chart][chart]\n\n[chart]: /media/chart.webp'),
  ).toContain('loading="lazy"');
  expect(
    renderLogMarkdown('![](/media/decoration.webp "decorative")'),
  ).toContain('alt=""');
});

test('tag archives include matching entries and canonical URLs with editorial indexing', async () => {
  const { logTags, logTagUrl, logTagIndexable } =
    await import('../src/portfolio/log-tags');
  const parsed = parseLog([
    { ...entry, revisions: [{ ...revision, tags: ['pgp'] }] },
  ]);
  expect(logTags(parsed).find((tag) => tag.slug === 'pgp')).toMatchObject({
    slug: 'pgp',
    title: 'PGP',
  });
  expect(
    logTags(parsed).find((tag) => tag.slug === 'pgp')!.entries,
  ).toHaveLength(1);
  expect(logTagUrl('pgp')).toBe('/log/tag/pgp');
  expect(logTagIndexable('pgp', parsed)).toBe(false);
});

test('article SEO uses latest metadata and original publication date', async () => {
  const { logArticleSchema, sitemapXml } = await import('../src/portfolio/seo');
  const parsed = parseLog([
    {
      ...entry,
      revisions: [
        revision,
        {
          ...revision,
          version: 2,
          publishedAt: '2026-10-17T09:00:00Z',
          title: 'Updated',
          language: 'tr',
          tags: ['pgp'],
        },
      ],
    },
  ])[0]!;
  const schema = logArticleSchema('https://portfolio.example', parsed)!;
  expect(schema['@graph'][0]).toMatchObject({
    '@type': 'BlogPosting',
    headline: 'Updated',
    inLanguage: 'tr',
    keywords: ['pgp'],
    datePublished: revision.publishedAt,
    dateModified: '2026-10-17T09:00:00Z',
  });
  expect(logArticleSchema(undefined, parsed)).toBeUndefined();
  expect(sitemapXml('https://portfolio.example')).toContain('<lastmod>');
});

test('archived headings and footnotes never reuse the active revision IDs', () => {
  const html = renderLogMarkdown(
    '## Details\n\nSee[^1]\n\n[^1]: Source',
    'archive-v1-',
  );
  expect(html).toContain('id="archive-v1-details"');
  expect(html).toContain('id="archive-v1-footnote-label"');
  expect(html).toContain('aria-describedby="archive-v1-footnote-label"');
});

test('used tag routes get canonical URLs but enter sitemap only after editorial approval', async () => {
  const { logEntries, logTagDefinitions } =
    await import('../src/portfolio/log');
  const { canonicalUrl, sitemapXml } = await import('../src/portfolio/seo');
  const parsed = parseLog([
    { ...entry, revisions: [{ ...revision, tags: ['pgp'] }] },
  ])[0]!;
  const wasIndexable = logTagDefinitions['pgp']!.indexable;
  logEntries.push(parsed);
  try {
    expect(canonicalUrl('https://portfolio.example', '/log/tag/pgp')).toBe(
      'https://portfolio.example/log/tag/pgp',
    );
    expect(
      canonicalUrl('https://portfolio.example', '/log/tag/unknown'),
    ).toBeUndefined();
    logTagDefinitions['pgp']!.indexable = false;
    expect(sitemapXml('https://portfolio.example')).not.toContain(
      '/log/tag/pgp',
    );
    logTagDefinitions['pgp']!.indexable = true;
    expect(sitemapXml('https://portfolio.example')).toContain('/log/tag/pgp');
  } finally {
    logEntries.pop();
    logTagDefinitions['pgp']!.indexable = wasIndexable;
  }
});

test('publication rejects broken local Log links but accepts references to another entry', () => {
  expect(() =>
    parseLog([
      {
        ...entry,
        revisions: [
          { ...revision, body: '[Missing](/log/missing-entry-here)' },
        ],
      },
    ]),
  ).toThrow('Unknown Log link');
  expect(
    parseLog([
      {
        ...entry,
        revisions: [
          { ...revision, body: '[Other](/log/other-entry-here#details)' },
        ],
      },
      { ...entry, id: 'other-entry-here' },
    ]),
  ).toHaveLength(2);
  expect(
    parseLog([
      {
        ...entry,
        revisions: [
          { ...revision, body: '`[Example](/log/missing-entry-here)`' },
        ],
      },
    ]),
  ).toHaveLength(1);
});

test('LaTeX renders inline and display equations with accessible MathML, keeping code literal', () => {
  const html = renderLogMarkdown(
    'Inline $E=mc^2$.\n\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$\n\n`$literal$`\n\n```tex\n$raw$\n```',
  );
  expect(html).toContain('class="katex"');
  expect(html).toContain('katex-display');
  expect(html).toContain('<math');
  expect(html).toContain('encoding="application/x-tex"');
  expect(html).toContain('<code>$literal$</code>');
  expect(html).toContain('$raw$');
  expect(renderLogMarkdown('Price: \\$5.')).not.toContain('class="katex"');
});

test('invalid math fails publication and unsafe TeX cannot emit links or external images', () => {
  expect(() => renderLogMarkdown('$\\frac{1}{$')).toThrow();
  const html = renderLogMarkdown(
    '$\\href{javascript:alert(1)}{click}$ and $\\includegraphics{https://evil.example/x.png}$',
  );
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('<img');
  expect(() => renderLogMarkdown('$\\def\\a{\\a}\\a$')).toThrow();
});

test('source callouts keep readable references and escape authored HTML', () => {
  const html = renderLogMarkdown(
    '> [!SOURCE]\n> [Specification](https://example.com/spec)\n>\n> <script>alert(1)</script>',
  );
  expect(html).toContain('data-callout="source"');
  expect(html).toContain('Source');
  expect(html).toContain('href="https://example.com/spec"');
  expect(html).not.toContain('<script>');
});

test('authored headings cannot collide with footnote accessibility IDs', () => {
  const html = renderLogMarkdown(
    '## Footnote label\n\n## Footnote label\n\nEvidence[^1]\n\n[^1]: Source',
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(html).toContain('aria-describedby="footnote-label"');
});

test('archived signed tag links do not prevent removing a tag in a later revision', () => {
  const original = {
    ...entry,
    revisions: [{ ...revision, tags: ['pgp'], body: '[PGP](/log/tag/pgp)' }],
  };
  const signed = revisionMarkdown(parseLog([original])[0]!, 1);
  const updated = parseLog([
    {
      ...original,
      revisions: [
        ...original.revisions,
        {
          ...revision,
          version: 2,
          publishedAt: '2026-10-17T09:00:00Z',
          tags: ['privacy'],
          body: 'Updated',
        },
      ],
    },
  ])[0]!;
  expect(revisionMarkdown(updated, 1)).toBe(signed);
});
