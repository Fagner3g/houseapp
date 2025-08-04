import { sql } from 'drizzle-orm'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/config/env'
import { expenses } from './schemas/expenses'
import { goalCompletions } from './schemas/goalCompletions'
import { goals } from './schemas/goals'
import { invites } from './schemas/invites'
import { organizations } from './schemas/organization'
import { userOrganizations } from './schemas/userOrganization'
import { users } from './schemas/users'

const schema = {
  invites,
  users,
  organizations,
  userOrganizations,
  goals,
  goalCompletions,
  expenses,
}

type Database = PostgresJsDatabase<typeof schema>

export const client = postgres(env.DATABASE_URL, {})
export const db = drizzle(client, {
  schema,
  logger: env.LOG_SQL
    ? {
        logQuery: (query, params) => {
          console.log('\n\x1b[36m→ SQL QUERY:\x1b[0m %s', query)
          if (params?.length) {
            console.log('\x1b[33m→ PARAMS:\x1b[0m')
            console.dir(params, { depth: 4, colors: true })
          }
        },
      }
    : false,
})

export async function ping(db: Database) {
  return db.execute(sql`SELECT 1`)
}
