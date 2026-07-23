import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/config/env'
import { accounts } from './schemas/accounts'
import { alertRules } from './schemas/alertRules'
import { cards } from './schemas/cards'
import { categories } from './schemas/categories'
import { invites } from './schemas/invites'
import { notifications } from './schemas/notifications'
import { organizationMembers } from './schemas/organizationMembers'
import { organizations } from './schemas/organizations'
import { recurringTransactions } from './schemas/recurringTransactions'
import { splitPaymentRequests } from './schemas/splitPaymentRequests'
import { splitPayments } from './schemas/splitPayments'
import { statements } from './schemas/statements'
import { systemSettings } from './schemas/systemSettings'
import { transactionAttachments } from './schemas/transactionAttachments'
import { transactionCategories } from './schemas/transactionCategories'
import { transactionSplits } from './schemas/transactionSplits'
import { transactions } from './schemas/transactions'
import { users } from './schemas/users'
import { getDatabaseString } from './setup'

const schema = {
  users,
  organizations,
  organizationMembers,
  invites,
  accounts,
  cards,
  categories,
  transactions,
  recurringTransactions,
  transactionSplits,
  splitPayments,
  splitPaymentRequests,
  transactionCategories,
  statements,
  transactionAttachments,
  alertRules,
  notifications,
  systemSettings,
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
