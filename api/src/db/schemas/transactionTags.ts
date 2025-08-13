import { pgTable, text } from 'drizzle-orm/pg-core'

import { tags } from './tags'
import { transactions } from './transactions'

export const transactionTags = pgTable('transaction_tags', {
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
})
