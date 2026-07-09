import { createId } from '@paralleldrive/cuid2'
import { bigint, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { transactionSplits } from './transactionSplits'

export type SplitPaymentMethod = 'pix' | 'cash' | 'transfer' | 'other'

export const splitPayments = pgTable(
  'split_payments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    splitId: text('split_id')
      .notNull()
      .references(() => transactionSplits.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    method: text('method').$type<SplitPaymentMethod>(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('idx_split_payments_split').on(table.splitId)]
)
