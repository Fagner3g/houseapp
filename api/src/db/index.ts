import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/config/env'
import { goalCompletions } from './schemas/goalCompletions'
import { goals } from './schemas/goals'
import { invites } from './schemas/invites'
import { organizations } from './schemas/organization'
import { transactionChatMessages } from './schemas/transactionChatMessages'
import { transactionOccurrences } from './schemas/transactionOccurrences'
import { transactionSeries } from './schemas/transactionSeries'
import { transactionTags } from './schemas/transactionTags'
import { userOrganizations } from './schemas/userOrganization'
import { users } from './schemas/users'
import { getDatabaseString } from './setup'

const schema = {
  invites,
  users,
  organizations,
  userOrganizations,
  goals,
  goalCompletions,
  transactionTags,
  transactionSeries,
  transactionOccurrences,
  transactionChatMessages,
}

const { baseUrl } = getDatabaseString()
export const client = postgres(baseUrl, {})

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
