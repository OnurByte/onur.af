import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

interface DebugEvent {
  event:
    | 'http.redirect'
    | 'http.response'
    | 'http.exception'
    | 'publication.unavailable'
    | 'response.stream-error';
  level: 'info' | 'warn' | 'error';
  method: string;
  /** Astro's registered route pattern, never a request URL or path parameter. */
  route: string;
  status: number;
  error?: unknown;
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const names = [
    'Error',
    'TypeError',
    'SyntaxError',
    'RangeError',
    'ReferenceError',
    'URIError',
    'AggregateError',
    'AbortError',
  ];
  const codes = [
    'ENOENT',
    'EACCES',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EPIPE',
    'ABORT_ERR',
    'ERR_STREAM_PREMATURE_CLOSE',
    'ERR_INVALID_URL',
    '23505',
    '42P01',
    '28000',
    '28P01',
    '53300',
    '57014',
  ];
  const code =
    'code' in error &&
    typeof error.code === 'string' &&
    codes.includes(error.code)
      ? error.code
      : undefined;
  // Error messages and full stacks may contain provider URLs, credentials or bodies.
  const frames = (error.stack ?? '')
    .slice(0, 16000)
    .split('\n')
    .slice(1)
    .flatMap((line) => {
      const match =
        /\b((?:src|dist\/server)\/[A-Za-z0-9_./[\]-]+\.(?:astro|ts|js|mjs)):(\d+):(\d+)\b/.exec(
          line.replaceAll('\\', '/'),
        );
      if (!match) return [];
      const [, file, lineNumber, column] = match;
      return file && lineNumber && column && !file.includes('..')
        ? [`${file}:${lineNumber}:${column}`]
        : [];
    })
    .slice(0, 5);
  return {
    name: names.includes(error.name) ? error.name : 'Error',
    ...(code ? { code } : {}),
    ...(frames.length ? { frames } : {}),
  };
}

/** Private, bounded JSON-lines diagnostics; failed logging never breaks a request. */
export function createDebugLogger({
  file,
  maxBytes = 1_048_576,
  mirror = false,
}: {
  file: string;
  maxBytes?: number;
  mirror?: boolean;
}) {
  let pending = Promise.resolve();
  let queued = 0;
  let warned = false;
  const warn = () => {
    if (!warned) {
      warned = true;
      console.warn('[debug] Log file unavailable; request handling continues.');
    }
  };
  return (event: DebugEvent): Promise<void> => {
    let line: string;
    try {
      const entry = {
        time: new Date().toISOString(),
        level: event.level,
        event: event.event,
        method: [
          'GET',
          'HEAD',
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'OPTIONS',
        ].includes(event.method)
          ? event.method
          : 'OTHER',
        route:
          /^\/[A-Za-z0-9_./[\]-]*$/.test(event.route) &&
          event.route.length <= 160
            ? event.route
            : '[unmatched]',
        status: event.status,
        error: errorDetails(event.error),
      };
      line = JSON.stringify(entry);
      if (mirror) {
        if (event.level === 'error') console.error(line);
        else if (event.level === 'warn') console.warn(line);
        else console.info(line);
      }
    } catch {
      warn();
      return Promise.resolve();
    }
    // Console mirroring stays available even when earlier file writes stall.
    if (queued >= 100) return Promise.resolve();
    queued++;
    pending = pending
      .then(async () => {
        await mkdir(dirname(file), { recursive: true, mode: 0o700 });
        let size = 0;
        try {
          size = (await stat(file)).size;
        } catch (error) {
          if (!(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ))
            throw error;
        }
        if (size >= maxBytes) await rename(file, `${file}.1`);
        await appendFile(file, `${line}\n`, { mode: 0o600 });
      })
      .catch(warn)
      .finally(() => {
        queued--;
      });
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      pending,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 250);
      }),
    ]).finally(() => {
      clearTimeout(timer);
    });
  };
}

let logger: ReturnType<typeof createDebugLogger> | undefined;
export function debugLog(event: DebugEvent): Promise<void> {
  if (process.env['PORTFOLIO_DEBUG_ENABLED'] === '0') return Promise.resolve();
  const configuredFile = process.env['PORTFOLIO_DEBUG_FILE'] ?? '';
  logger ??= createDebugLogger({
    file:
      configuredFile.length > 0
        ? configuredFile
        : process.env['VERCEL']
          ? join(tmpdir(), 'onur-debug.log')
          : join(process.cwd(), '.local', 'debug.log'),
    mirror: Boolean(process.env['VERCEL']),
  });
  return logger(event);
}
