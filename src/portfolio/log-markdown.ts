import { micromark } from 'micromark';
import { math, mathHtml } from 'micromark-extension-math';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings, {
  type Options as HeadingLinkOptions,
} from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toText } from 'hast-util-to-text';
import type { Root, Element } from 'hast';

export function validLogImageSource(value: string): boolean {
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

const isFootnoteHeading = (node: Element) =>
  /^h[1-6]$/.test(node.tagName) &&
  Array.isArray(node.properties.className) &&
  node.properties.className.includes('sr-only');

export function renderLogContent(body: string, prefix = '', sourceCount = 0) {
  const usedIds = new Set<string>();
  if (sourceCount > 0) {
    usedIds.add(`${prefix}log-sources`);
    for (let index = 1; index <= sourceCount; index += 1)
      usedIds.add(`${prefix}source-${index}`);
  }
  const images: string[] = [];
  const links: string[] = [];
  const headings: { id: string; text: string; depth: number }[] = [];
  const sourceReferences: { source: number; id: string }[] = [];
  // Raw HTML stays escaped; micromark also blocks executable protocols.
  const html = micromark(body, {
    extensions: [gfm(), math()],
    htmlExtensions: [
      gfmHtml({ clobberPrefix: `${prefix}fn-` }),
      mathHtml({
        trust: false,
        throwOnError: true,
        strict: 'ignore',
        maxExpand: 1000,
        maxSize: 20,
        output: 'htmlAndMathml',
      }),
    ],
  });
  const headingLinks: HeadingLinkOptions = {
    behavior: 'append',
    content: { type: 'text', value: ' #' },
    properties: { ariaHidden: 'true', tabIndex: -1 },
    test: (node) => !isFootnoteHeading(node),
  };
  const result = unified()
    .use(rehypeParse, { fragment: true })
    .use(() => (tree: Root) => {
      visit(tree, 'element', (node) => {
        if (isFootnoteHeading(node) && node.properties.id === 'footnote-label')
          node.properties.id = `${prefix}footnote-label`;
        if (node.properties.ariaDescribedBy)
          node.properties.ariaDescribedBy = (
            node.properties.ariaDescribedBy as string[]
          ).map((id) =>
            id === 'footnote-label' ? `${prefix}footnote-label` : id,
          );
        if (node.properties.id) usedIds.add(String(node.properties.id));
      });
    })
    .use(rehypeSlug, { prefix })
    .use(() => (tree: Root) => {
      visit(tree, 'element', (node) => {
        if (/^h[1-6]$/.test(node.tagName) && node.properties.id) {
          // The article title owns h1.
          if (node.tagName === 'h1') node.tagName = 'h2';
          if (!isFootnoteHeading(node)) {
            const original = String(node.properties.id);
            let id = original;
            let suffix = 1;
            while (usedIds.has(id)) id = `${original}-${suffix++}`;
            usedIds.add(id);
            node.properties.id = id;
            headings.push({
              id,
              text: toText(node),
              depth: Number(node.tagName[1]),
            });
          }
        }
        if (node.tagName === 'blockquote') {
          const paragraph = node.children.find(
            (child) => child.type === 'element' && child.tagName === 'p',
          );
          const first =
            paragraph?.type === 'element' ? paragraph.children[0] : undefined;
          const marker =
            first?.type === 'text'
              ? first.value.match(
                  /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|SOURCE)\](?:\n|$)/,
                )
              : null;
          if (marker && first?.type === 'text') {
            first.value = first.value.slice(marker[0].length);
            const kind = marker[1]!.toLowerCase();
            node.properties.dataCallout = kind;
            node.children.unshift({
              type: 'element',
              tagName: 'p',
              properties: { className: ['log-callout-title'] },
              children: [
                { type: 'text', value: kind[0]!.toUpperCase() + kind.slice(1) },
              ],
            });
          }
        }
        if (node.tagName === 'a' && typeof node.properties.href === 'string')
          links.push(node.properties.href);
        if (node.tagName === 'img') {
          const { src, alt, title } = node.properties;
          if (!validLogImageSource(String(src ?? '')))
            throw new Error('Log image requires a local path or HTTPS source');
          if (!String(alt ?? '').trim() && title !== 'decorative')
            throw new Error(
              'Log image requires descriptive alt text (or title "decorative")',
            );
          images.push(String(src));
          node.properties.loading = 'lazy';
          node.properties.decoding = 'async';
        }
      });
    })
    .use(() => (tree: Root) => {
      let nextReference = 0;
      const visitText = (parent: Root | Element, insideExcluded = false) => {
        const excluded =
          insideExcluded ||
          (parent.type === 'element' &&
            ['a', 'code', 'pre', 'script', 'style'].includes(parent.tagName));
        if (excluded) return;
        const children = parent.children;
        for (let index = 0; index < children.length; index += 1) {
          const child = children[index]!;
          if (child.type === 'text' && sourceCount > 0) {
            const parts: (typeof child | Element)[] = [];
            const pattern = /\[(\d+)\]/g;
            let lastIndex = 0;
            for (const match of child.value.matchAll(pattern)) {
              const source = Number(match[1]);
              if (source < 1 || source > sourceCount) continue;
              const start = match.index!;
              if (start > lastIndex)
                parts.push({
                  type: 'text',
                  value: child.value.slice(lastIndex, start),
                });
              const id = `${prefix}source-ref-${source}-${++nextReference}`;
              sourceReferences.push({ source, id });
              parts.push({
                type: 'element',
                tagName: 'sup',
                properties: { className: ['log-source-reference'] },
                children: [
                  {
                    type: 'element',
                    tagName: 'a',
                    properties: {
                      href: `#${prefix}source-${source}`,
                      id,
                      ariaLabel: `Source ${source}`,
                    },
                    children: [{ type: 'text', value: `[${source}]` }],
                  },
                ],
              });
              lastIndex = start + match[0].length;
            }
            if (lastIndex > 0) {
              if (lastIndex < child.value.length)
                parts.push({
                  type: 'text',
                  value: child.value.slice(lastIndex),
                });
              children.splice(index, 1, ...parts);
              index += parts.length - 1;
            }
          } else if (child.type === 'element') {
            visitText(child, excluded);
          }
        }
      };
      visitText(tree);
    })
    .use(rehypeAutolinkHeadings, headingLinks)
    .use(rehypeStringify)
    .processSync(html);
  return { html: String(result), headings, links, images, sourceReferences };
}
export const renderLogMarkdown = (body: string, prefix = ''): string =>
  renderLogContent(body, prefix).html;
