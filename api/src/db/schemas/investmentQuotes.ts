import { createId } from '@paralleldrive/cuid2'
import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { investmentAssets } from './investmentAssets'

export const investmentQuotes = pgTable('investment_quotes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  assetId: text('asset_id')
    .notNull()
    .references(() => investmentAssets.id, { onDelete: 'cascade' }),
  source: text('source').$type<'auto' | 'manual'>().notNull(),
  price: bigint('price', { mode: 'bigint' }).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
