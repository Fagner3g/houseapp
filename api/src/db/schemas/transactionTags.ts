import { pgTable, text } from 'drizzle-orm/pg-core'

import { tags } from './tags'
import { transactionSeries } from './transactionSeries'

export const transactionTags = pgTable('transaction_tags', {
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactionSeries.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
})
