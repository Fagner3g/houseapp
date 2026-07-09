import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core'

import { categories } from './categories'
import { transactions } from './transactions'

export const transactionCategories = pgTable(
  'transaction_categories',
  {
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  table => [primaryKey({ columns: [table.transactionId, table.categoryId] })]
)
