import { createId } from '@paralleldrive/cuid2'
import { bigint, boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { users } from './users'

export const transactionSeries = pgTable('transactions_series', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text('title').notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  type: text('type').$type<'income' | 'expense'>().notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  recurrenceType: text('recurrence_type').$type<'monthly' | 'weekly' | 'yearly'>().notNull(),
  recurrenceInterval: integer('recurrence_interval').notNull().default(1),
  installmentsTotal: integer('installments_total'),
  recurrenceUntil: timestamp('recurrence_until', { withTimezone: true }),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  payToId: text('pay_to_id')
    .notNull()
    .references(() => users.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
