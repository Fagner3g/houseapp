import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Ler versão do package.json raiz do projeto (com fallback)
let appVersion = '1.0.6' // fallback
try {
  const rootPackageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
  )
  appVersion = rootPackageJson.version
} catch (error) {
  // Se não conseguir ler o package.json raiz, usa o fallback
  console.warn('Could not read root package.json, using fallback version:', appVersion)
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
