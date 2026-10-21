import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      'public/**',
      '.playwright-mcp/**',
      '.serena/**',
    ],
  },
  {
    files: [
      'src/**/*.ts',
      'tests/**/*.ts',
      'scripts/**/*.ts',
      'astro.config.ts',
      'playwright.config.ts',
      'integrations/**/*.ts',
    ],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
    },
  },
  ...astro.configs.recommended,
  { files: ['**/*.astro'], rules: { 'astro/no-set-html-directive': 'error' } },
]);
