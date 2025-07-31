import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { users } from './users'

export const userOrganizations = pgTable(
  'user_organizations',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [unique().on(table.userId, table.organizationId)]
)
