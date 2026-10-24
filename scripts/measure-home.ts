// Local production SSR measurement; do not use this as a production cost claim.
import { writeFile, mkdir } from 'node:fs/promises';
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:14323/');
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  url.protocol !== 'http:' ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
)
  throw new Error('Use a loopback HTTP URL without credentials/query');
const observations: { ttfbMs: number; completeMs: number; bytes: number }[] =
  [];
for (let index = 0; index < 20; index++) {
  const start = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const ttfbMs = performance.now() - start;
  if (!response.ok)
    throw new Error(`Home measurement HTTP ${String(response.status)}`);
  const bytes = (await response.arrayBuffer()).byteLength;
  observations.push({ ttfbMs, completeMs: performance.now() - start, bytes });
}
const percentile = (values: number[], percent: number) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * percent) - 1];
const result = {
  scope:
    'local production SSR, sequential requests; first observation is process/cache dependent, subsequent observations are warm candidates',
  url: url.origin + url.pathname,
  samples: observations.length,
  first: observations[0],
  warmP95TtfbMs: percentile(
    observations.slice(1).map((item) => item.ttfbMs),
    0.95,
  ),
  warmP95CompleteMs: percentile(
    observations.slice(1).map((item) => item.completeMs),
    0.95,
  ),
  observations,
  limitations:
    'No real visitor INP/LCP, upstream-server request count, billing or controlled fresh-process cold-start claim.',
};
await mkdir('.local', { recursive: true });
await writeFile(
  '.local/home-performance.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result));
