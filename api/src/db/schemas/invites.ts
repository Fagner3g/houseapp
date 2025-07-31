import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'

export const invites = pgTable('invites', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  email: text('email').notNull(),
  token: text('token').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
