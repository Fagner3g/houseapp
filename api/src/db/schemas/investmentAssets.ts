import { createId } from '@paralleldrive/cuid2'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { users } from './users'

export const investmentAssets = pgTable('investment_assets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  displayName: text('display_name').notNull(),
  assetClass: text('asset_class').notNull(),
  quotePreference: text('quote_preference')
    .$type<'auto' | 'manual' | 'auto_with_manual_fallback'>()
    .notNull()
    .default('auto_with_manual_fallback'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
