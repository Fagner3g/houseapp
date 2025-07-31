import { defineConfig } from 'drizzle-kit'

import { env } from './src/settings/env'

export default defineConfig({
  schema: './src/db/schemas',
  out: './.migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
