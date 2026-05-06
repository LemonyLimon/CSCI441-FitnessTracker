import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@server': fileURLToPath(new URL('.', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 20,
        statements: 40,
      },
    },
  },
});
