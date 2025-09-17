import { defineConfig } from 'drizzle-kit'

// Função simplificada para obter a URL do banco sem dependências complexas
function getDatabaseUrl(): string {
  const dbName = process.env.DB_NAME || 'houseapp'
  const host = process.env.DB_HOST || 'localhost'
  const port = process.env.DB_PORT || '5432'
  const username = process.env.DB_USER || 'postgres'
  const password = process.env.DB_PASSWORD

  if (!password) {
    throw new Error('DB_PASSWORD is required')
  }

  return `postgresql://${username}:${password}@${host}:${port}/${dbName}`
}

export default defineConfig({
  schema: './src/db/schemas',
  out: './.migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
})
