import { createId } from '@paralleldrive/cuid2'
import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { users } from './users'

type TransactionCategory = 'expense' | 'income'

export const transactions = pgTable('transactions', {
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
    .references(() => organizations.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  recurrenceStart: timestamp('recurrence_start', { withTimezone: true }),
  installmentsTotal: integer('installments_total'),
  installmentsPaid: integer('installments_paid').notNull().default(0),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceType: text('recurrence_type')
    .$type<'monthly' | 'weekly' | 'yearly' | 'custom'>()
    .default('monthly'),
  recurrenceUntil: timestamp('recurrence_until', { withTimezone: true }),
  recurrenceInterval: integer('recurrence_interval'),
  type: text('type').$type<TransactionCategory>().notNull(),
})
