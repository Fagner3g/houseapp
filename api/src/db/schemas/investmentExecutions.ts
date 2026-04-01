import { createId } from '@paralleldrive/cuid2'
import { bigint, doublePrecision, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { investmentAssets } from './investmentAssets'
import { investmentPlans } from './investmentPlans'
import { users } from './users'

export const investmentExecutions = pgTable('investment_executions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assetId: text('asset_id')
    .notNull()
    .references(() => investmentAssets.id, { onDelete: 'cascade' }),
  planId: text('plan_id').references(() => investmentPlans.id, { onDelete: 'set null' }),
  referenceMonth: text('reference_month').notNull(),
  plannedAmount: bigint('planned_amount', { mode: 'bigint' }),
  plannedQuantity: doublePrecision('planned_quantity'),
  investedAmount: bigint('invested_amount', { mode: 'bigint' }).notNull(),
  executedQuantity: doublePrecision('executed_quantity').notNull(),
  executedUnitPrice: bigint('executed_unit_price', { mode: 'bigint' }).notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
