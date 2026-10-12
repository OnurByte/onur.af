import { describe, expect, test } from 'bun:test';
import {
  escapeXml,
  opmlXml,
  rssResponse,
  rssXml,
  wantsFeedHtml,
} from '../src/portfolio/feeds';
import {
  notes,
  projects,
  reading,
  publicEditorialPaths,
} from '../src/portfolio/content';

describe('public feeds', () => {
  test('serves HTML only when preferred over XML, with XML as the default', () => {
    expect(wantsFeedHtml(null)).toBe(false);
    expect(wantsFeedHtml('*/*')).toBe(false);
    expect(wantsFeedHtml('text/html,application/xml;q=0.9,*/*;q=0.8')).toBe(
      true,
    );
    expect(wantsFeedHtml('application/rss+xml,text/html;q=0.1')).toBe(false);
    expect(wantsFeedHtml('text/html;q=0')).toBe(false);
    expect(wantsFeedHtml('application/xml,text/html')).toBe(false);
    expect(wantsFeedHtml('text/html;q=invalid')).toBe(false);
  });
  test('escapes XML text and attributes', () => {
    expect(escapeXml(`A&B <tag> "quote" 'single'`)).toBe(
      'A&amp;B &lt;tag&gt; &quot;quote&quot; &apos;single&apos;',
    );
  });
  test('requires a validated public origin', () => {
    for (const origin of [
      undefined,
      'https://example.com/private',
      'not a url',
    ]) {
      expect(rssXml(origin)).toBeUndefined();
      expect(rssResponse(origin).status).toBe(503);
    }
  });
  test('serves local feeds without a public domain and rejects arbitrary request hosts', () => {
    expect(
      rssResponse(undefined, new URL('http://127.0.0.1:4338/rss.xml')).status,
    ).toBe(200);
    expect(rssXml('http://localhost:4338')).toContain(
      '<link>http://localhost:4338/notes</link>',
    );
    expect(
      rssResponse(undefined, new URL('https://unconfigured.example/rss.xml'))
        .status,
    ).toBe(503);
    expect(rssXml('http://localhost:4338/other')).toBeUndefined();
    expect(rssXml('http://localhost:999999')).toBeUndefined();
    expect(rssXml('http://user@localhost:4338')).toBeUndefined();
  });
  test('empty infrastructure does not invent authored content or subscriptions', () => {
    expect(projects).toHaveLength(0);
    expect(notes).toHaveLength(0);
    expect(reading).toHaveLength(0);
    const xml = rssXml('https://example.com')!;
    expect(xml).toContain('<channel>');
    expect(xml).not.toContain('<item>');
    expect(xml).not.toContain('/donate');
    expect(xml).not.toContain('/checkout/');
    expect(rssResponse('https://example.com').headers.get('Content-Type')).toBe(
      'text/xml; charset=utf-8',
    );
    expect(opmlXml()).not.toContain('<outline ');
    expect(publicEditorialPaths).toEqual([
      '/projects',
      '/notes',
      '/reading',
      '/identity',
      '/rss',
      '/pgp',
    ]);
  });
  test('publishes full escaped text, dates and stable canonical GUIDs', () => {
    const fixture = [
      {
        slug: 'sample',
        title: 'A & B',
        date: '2026-10-12',
        summary: 'Summary',
        paragraphs: ['<example>', 'Second & paragraph'],
      },
    ];
    const xml = rssXml('https://example.com', fixture)!;
    expect(xml.match(/<item>/g)).toHaveLength(1);
    expect(xml).toContain('<title>A &amp; B</title>');
    expect(xml).toContain('<link>https://example.com/notes/sample</link>');
    expect(xml).toContain(
      '<guid isPermaLink="true">https://example.com/notes/sample</guid>',
    );
    expect(xml).toContain('Mon, 12 Oct 2026 00:00:00 GMT');
    expect(xml).toContain('&lt;example&gt;\n\nSecond &amp; paragraph');
  });
  test('exports configured feed attributes with escaping', () => {
    const xml = opmlXml([
      {
        name: 'A & B',
        url: 'https://example.com/?a=1&b=2',
        source: 'https://example.com/source',
        summary: 'Example',
        feed: 'https://example.com/feed?a=1&b=2',
      },
    ]);
    expect(xml).toContain('text="A &amp; B"');
    expect(xml).toContain('xmlUrl="https://example.com/feed?a=1&amp;b=2"');
    expect(xml).toContain('htmlUrl="https://example.com/?a=1&amp;b=2"');
  });
});
