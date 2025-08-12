import { pgTable, text } from 'drizzle-orm/pg-core'

import { transactions } from './transactions'

export const transactionTags = pgTable('transaction_tags', {
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
})
