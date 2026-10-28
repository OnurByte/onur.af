import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDebugLogger } from '../src/server/debug-log';

test('debug entries distinguish redirects and errors without recording private error messages', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onur-debug-'));
  try {
    const file = join(directory, 'debug.log');
    const log = createDebugLogger({ file });
    const error = new TypeError(
      'Bearer private-token password=private-password',
    );
    error.stack =
      'TypeError: private-token\n    at render (/workspace/src/pages/log/[id].astro:42:7)';
    await log({
      event: 'http.redirect',
      level: 'info',
      method: 'GET',
      route: '/log/[id]',
      status: 308,
    });
    await log({
      event: 'http.exception',
      level: 'error',
      method: 'GET',
      route: '/log/[id]',
      status: 500,
      error,
    });
    const text = await readFile(file, 'utf8');
    expect(text).toContain('http.redirect');
    expect(text).toContain('TypeError');
    expect(text).toContain('src/pages/log/[id].astro:42:7');
    expect(text).not.toContain('private-token');
    expect(text).not.toContain('private-password');
    expect(text).not.toContain('/workspace');
    expect(text.trim().split('\n')).toHaveLength(2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('debug writes serialize concurrent entries and rotate the bounded local file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onur-debug-'));
  try {
    const file = join(directory, 'debug.log');
    const log = createDebugLogger({ file, maxBytes: 400 });
    await Promise.all(
      Array.from({ length: 20 }, () =>
        log({
          event: 'http.response',
          level: 'warn',
          method: 'GET',
          route: '/missing',
          status: 404,
        }),
      ),
    );
    for (const path of [file, `${file}.1`]) {
      const lines = (await readFile(path, 'utf8')).trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines)
        expect(() => JSON.parse(line) as unknown).not.toThrow();
    }
    expect((await readFile(file, 'utf8')).length).toBeLessThan(700);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an unavailable log destination never rejects the application operation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'onur-debug-'));
  try {
    const log = createDebugLogger({ file: directory });
    await log({
      event: 'http.response',
      level: 'error',
      method: 'POST',
      route: '/api/annotations',
      status: 503,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === 'win32')(
  'stalled storage cannot hold up the application response',
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'onur-debug-stall-'));
    const file = join(directory, 'debug.log');
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await writeFile(file, 'Existing log entry.');
      const fifo = Bun.spawn(['mkfifo', `${file}.1`], {
        stdout: 'ignore',
        stderr: 'ignore',
      });
      expect(await fifo.exited).toBe(0);
      const log = createDebugLogger({ file, maxBytes: 1 });
      const write = log({
        event: 'http.response',
        level: 'error',
        method: 'GET',
        route: '/log/[id]',
        status: 500,
      });
      try {
        const returned = await Promise.race([
          write.then(() => true),
          new Promise<boolean>((resolve) => {
            deadline = setTimeout(() => {
              resolve(false);
            }, 750);
          }),
        ]);
        expect(returned).toBe(true);
      } finally {
        // Drain the named pipe so the test leaves no blocked filesystem operation.
        await readFile(`${file}.1`, 'utf8');
        await write;
      }
    } finally {
      clearTimeout(deadline);
      await rm(directory, { recursive: true, force: true });
    }
  },
);

for (const destination of ['active', 'backup'] as const) {
  test.skipIf(process.platform === 'win32')(
    `debug logging refuses a symlink at the ${destination} destination`,
    async () => {
      const directory = await mkdtemp(join(tmpdir(), 'onur-debug-symlink-'));
      try {
        const file = join(directory, 'debug.log');
        const target = join(directory, 'unrelated.txt');
        await writeFile(target, 'Unrelated private file.');
        if (destination === 'active') await symlink(target, file);
        else {
          await writeFile(file, 'Existing log entry.');
          await symlink(target, `${file}.1`);
        }
        const log = createDebugLogger({
          file,
          maxBytes: destination === 'active' ? 1024 : 1,
        });
        await log({
          event: 'http.response',
          level: 'error',
          method: 'GET',
          route: '/log/[id]',
          status: 500,
        });
        expect(await readFile(target, 'utf8')).toBe('Unrelated private file.');
        if (destination === 'backup')
          expect(await readFile(file, 'utf8')).toBe('Existing log entry.');
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
}
