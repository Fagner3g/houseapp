import { createId } from '@paralleldrive/cuid2'
import { bigint, boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { accounts } from './accounts'
import { categories } from './categories'
import { organizations } from './organizations'

export type RecurringTransactionType = 'income' | 'expense'
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export const recurringTransactions = pgTable('recurring_transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  type: text('type').$type<RecurringTransactionType>().notNull(),
  counterparty: text('counterparty'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  frequency: text('frequency').$type<RecurringFrequency>().notNull(),
  interval: integer('interval').notNull().default(1),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  installmentsTotal: integer('installments_total'),
  isActive: boolean('is_active').notNull().default(true),
  lastGeneratedDate: timestamp('last_generated_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
