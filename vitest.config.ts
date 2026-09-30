import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // React 17+ JSX transform, as Next compiles it (component tests need no `import React`).
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
