import { createId } from '@paralleldrive/cuid2'
import { bigint, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { transactionSeries } from './transactionSeries'

export const transactionOccurrences = pgTable('transactions_occurrences', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  seriesId: text('series_id')
    .notNull()
    .references(() => transactionSeries.id, { onDelete: 'cascade' }),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  installmentIndex: integer('installment_index').notNull(),
  status: text('status').$type<'pending' | 'paid' | 'canceled'>().notNull().default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  valuePaid: integer('value_paid'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
