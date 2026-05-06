import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.css',
        'src/assets/**',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 30,
        statements: 50,
      },
    },
  },
});
