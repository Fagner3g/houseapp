import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/http/server.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  // Bundle local TS package (main points at src/*.ts)
  noExternal: ['@houseapp/finance-core'],
})
