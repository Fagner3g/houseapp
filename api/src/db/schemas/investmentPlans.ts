import { createId } from '@paralleldrive/cuid2'
import {
  bigint,
  boolean,
  pgTable,
  text,
  timestamp,
  doublePrecision,
} from 'drizzle-orm/pg-core'

import { investmentAssets } from './investmentAssets'
import { users } from './users'

export const investmentPlans = pgTable('investment_plans', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assetId: text('asset_id')
    .notNull()
    .references(() => investmentAssets.id, { onDelete: 'cascade' }),
  frequency: text('frequency').$type<'monthly'>().notNull().default('monthly'),
  mode: text('mode').$type<'amount' | 'quantity'>().notNull(),
  progressionType: text('progression_type').$type<'fixed' | 'linear_step'>().notNull(),
  initialAmount: bigint('initial_amount', { mode: 'bigint' }),
  initialQuantity: doublePrecision('initial_quantity'),
  stepAmount: bigint('step_amount', { mode: 'bigint' }),
  stepQuantity: doublePrecision('step_quantity'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
