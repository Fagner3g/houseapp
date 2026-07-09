import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organizations'
import { users } from './users'

export type OrganizationMemberRole = 'owner' | 'admin' | 'member'

export const organizationMembers = pgTable(
  'organization_members',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').$type<OrganizationMemberRole>().notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [primaryKey({ columns: [table.userId, table.organizationId] })]
)
