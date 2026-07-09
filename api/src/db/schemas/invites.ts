import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organizations'
import { users } from './users'

export const invites = pgTable('invites', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => users.id),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
