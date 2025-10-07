import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Define versão priorizando variável de ambiente (útil no Docker/CI)
let appVersion = process.env.VITE_APP_VERSION || '0.0.0'
try {
  const rootPackageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
  )
  appVersion = rootPackageJson.version
} catch (error) {
  // Se não conseguir ler o package.json raiz, usa o fallback
  console.warn('Could not read root package.json, using env/fallback version:', appVersion)
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
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
})
