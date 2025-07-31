import { createId } from '@paralleldrive/cuid2'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { users } from './users'

export const expenses = pgTable('expenses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text('title').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  payToId: text('pay_to_id')
    .notNull()
    .references(() => users.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  amount: integer('amount').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
