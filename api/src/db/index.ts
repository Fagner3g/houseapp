import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '../settings/env'
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

export const client = postgres(env.DATABASE_URL)
export const db = drizzle(client, { schema, logger: true })
