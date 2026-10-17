import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:14323',
    browserName: 'chromium',
    ...(process.env['CHROME_PATH']
      ? { launchOptions: { executablePath: process.env['CHROME_PATH'] } }
      : {}),
  },
  webServer: {
    command: 'bun tests/browser/server.ts',
    url: 'http://127.0.0.1:14323',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
