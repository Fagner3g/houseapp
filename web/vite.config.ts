import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// CI/Docker injects VITE_APP_VERSION (e.g. 2.0.0-98d9bc7-develop); local dev falls back to package.json.
let appVersion = process.env.VITE_APP_VERSION ?? ''
if (!appVersion) {
  try {
    const rootPackageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
    )
    appVersion = rootPackageJson.version
  } catch {
    appVersion = '0.0.0'
    console.warn('Could not read root package.json, using fallback version:', appVersion)
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/pages',
      routeToken: 'layout',
    }),
    react(),
    tailwindcss(),
  ],
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
    server: {
      deps: {
        inline: ['@houseapp/finance-core'],
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
})
