import { describe, expect, test } from 'bun:test';
import {
  escapeXml,
  rssResponse,
  rssXml,
  wantsFeedHtml,
} from '../src/portfolio/feeds';

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
      '<link>http://localhost:4338/rss</link>',
    );
    expect(
      rssResponse(undefined, new URL('https://unconfigured.example/rss.xml'))
        .status,
    ).toBe(503);
    expect(rssXml('http://localhost:4338/other')).toBeUndefined();
    expect(rssXml('http://localhost:999999')).toBeUndefined();
    expect(rssXml('http://user@localhost:4338')).toBeUndefined();
  });
  test('publishes an empty RSS channel without invented content', async () => {
    const xml = rssXml('https://example.com')!;
    expect(xml).toContain('<channel>');
    expect(xml).toContain('<title>Onur — RSS</title>');
    expect(xml).toContain('<link>https://example.com/rss</link>');
    expect(xml).toContain(
      '<description>Follow new writing via RSS.</description>',
    );
    expect(xml).not.toContain('<item>');
    expect(xml).not.toContain('/notes');
    expect(xml).not.toContain('/donate');
    const response = rssResponse('https://example.com');
    expect(response.headers.get('Content-Type')).toBe(
      'text/xml; charset=utf-8',
    );
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(await response.text()).toBe(xml);
  });
});
