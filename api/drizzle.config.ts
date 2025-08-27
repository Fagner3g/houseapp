import { defineConfig } from 'drizzle-kit'

import { getDatabaseString } from './src/db/setup'

const { baseUrl } = getDatabaseString()

export default defineConfig({
  schema: './src/db/schemas',
  out: './.migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: baseUrl,
  },
})
