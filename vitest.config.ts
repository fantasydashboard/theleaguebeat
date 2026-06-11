import { defineConfig } from 'vitest/config'
import path from 'path'

// Standalone test config — kept separate from vite.config.ts so the
// build doesn't carry test settings. The editorial logic under test is
// pure (no DOM), so the node environment is enough. Mirrors the `@`
// alias so tests import modules the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
