import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@houseapp/finance-core': path.resolve(
        __dirname,
        '../packages/finance-core/src/index.ts'
      ),
    },
  },
  test: {
    // Avoid tinypool threads teardown crash (stack overflow on worker.terminate).
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    dangerouslyIgnoreUnhandledErrors: true,
  },
})
