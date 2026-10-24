import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: '**/*.smoke.ts',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:14323' },
  projects: (['chromium', 'firefox', 'webkit'] as const).map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
});
