import { z } from 'astro/zod';
import { createHash } from 'node:crypto';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { visit } from 'unist-util-visit';
import { publicRequest, validatePublicUrl } from './public-request';

function htmlElements(html: string) {
  const elements: { tag: string; properties: Record<string, unknown> }[] = [];
  const tree = unified().use(rehypeParse).parse(html);
  visit(tree, 'element', (node) => {
    elements.push({ tag: node.tagName, properties: node.properties });
  });
  return elements;
}
const rels = (value: unknown) =>
  Array.isArray(value) ? value.map(String) : String(value ?? '').split(/\s+/);
export function discoverWebmention(
  target: string,
  headers: Headers,
  html: string,
): string | undefined {
  const candidates: string[] = [];
  const link = headers.get('link') ?? '';
  for (const match of link.matchAll(/<([^>]+)>([^<]*)(?=,\s*<|$)/g)) {
    const rel = match[2]!.match(/;\s*rel\s*=\s*(?:"([^"]+)"|([^;\s,]+))/i);
    if (rels(rel?.[1] ?? rel?.[2]).includes('webmention'))
      candidates.push(match[1]!);
  }
  for (const node of htmlElements(html)) {
    if (
      ['link', 'a'].includes(node.tag) &&
      rels(node.properties['rel']).includes('webmention') &&
      typeof node.properties['href'] === 'string'
    )
      candidates.push(node.properties['href']);
  }
  for (const href of candidates) {
    try {
      return validatePublicUrl(new URL(href, target).href).href;
    } catch {
      /* Ignore unsafe endpoint declarations. */
    }
  }
  return undefined;
}

const deliveryReceiptSchema = z
  .object({
    source: z.url(),
    target: z.url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.enum(['sent', 'unsupported', 'failed']),
    attemptedAt: z.iso.datetime({ offset: true }),
    endpoint: z.url().optional(),
    error: z.string().optional(),
  })
  .strict();
export type DeliveryReceipt = z.infer<typeof deliveryReceiptSchema>;

export function parseDeliveryReceipts(input: unknown): DeliveryReceipt[] {
  return z.array(deliveryReceiptSchema).parse(input);
}

type Request = (
  url: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: string;
    headers?: Record<string, string>;
  },
) => Promise<Response>;

/** Call only after deployment. Failures per target never invalidate a local publication. */
export async function deliverWebmentions(
  input: {
    source: string;
    version: number;
    revisionUrl: string;
    markdown: string;
    targets: readonly string[];
  },
  previous: readonly DeliveryReceipt[],
  request: Request = publicRequest,
  persist?: (receipt: DeliveryReceipt) => Promise<void>,
): Promise<DeliveryReceipt[]> {
  const source = validatePublicUrl(input.source).href;
  const revisionUrl = validatePublicUrl(input.revisionUrl);
  if (revisionUrl.origin !== new URL(source).origin)
    throw new Error('Revision must share source origin');
  const revision = await request(revisionUrl.href);
  if (!revision.ok || (await revision.text()) !== input.markdown)
    throw new Error('Exact revision is not live');
  const page = await request(source);
  if (!page.ok) throw new Error('Source is not live');
  const elements = htmlElements(await page.text());
  if (
    !elements.some(
      (node) =>
        node.tag === 'article' &&
        rels(node.properties['className']).includes('h-entry') &&
        String(node.properties['dataLogVersion']) === String(input.version),
    )
  )
    throw new Error('Current source revision is not live');
  const liveLinks = new Set(
    elements.flatMap((node) => {
      if (node.tag !== 'a' || typeof node.properties['href'] !== 'string')
        return [];
      try {
        return [new URL(node.properties['href'], source).href];
      } catch {
        return [];
      }
    }),
  );
  const sha256 = createHash('sha256').update(input.markdown).digest('hex');
  const receipts: DeliveryReceipt[] = [];
  for (const target of [...new Set(input.targets)]) {
    const prior = previous.find(
      (item) =>
        item.source === source &&
        item.target === target &&
        item.sha256 === sha256 &&
        item.status === 'sent',
    );
    if (prior) {
      receipts.push(prior);
      continue;
    }
    const receipt: DeliveryReceipt = {
      source,
      target,
      sha256,
      status: 'failed',
      attemptedAt: new Date().toISOString(),
    };
    try {
      validatePublicUrl(target);
      if (!liveLinks.has(target))
        throw new Error('Target is absent from live source');
      const response = await request(target);
      if (!response.ok) throw new Error(`Target returned ${response.status}`);
      const endpoint = discoverWebmention(
        response.url || target,
        response.headers,
        await response.text(),
      );
      if (!endpoint) receipt.status = 'unsupported';
      else {
        receipt.endpoint = endpoint;
        const delivered = await request(endpoint, {
          method: 'POST',
          body: new URLSearchParams({ source, target }).toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!delivered.ok)
          throw new Error(`Endpoint returned ${delivered.status}`);
        receipt.status = 'sent';
      }
    } catch (error) {
      receipt.error =
        error instanceof Error ? error.message : 'Delivery failed';
    }
    if (persist) await persist(receipt);
    receipts.push(receipt);
  }
  return receipts;
}
