import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/core/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/core/**/*.ts'],
      exclude: ['packages/core/__tests__/**'],
    },
  },
});
