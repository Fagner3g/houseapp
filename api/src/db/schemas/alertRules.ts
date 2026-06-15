import { createId } from '@paralleldrive/cuid2'
import { boolean, json, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { transactionSeries } from './transactionSeries'
import { users } from './users'

export type AlertRuleScope = 'organization' | 'series'
export type AlertRuleTarget = 'transaction' | 'reminder'
export type AlertRuleKind = 'upcoming' | 'overdue'
export type AlertRuleChannel = 'in_app' | 'whatsapp' | 'extension'
export type AlertRuleRecipient = 'owner' | 'pay_to' | 'both' | 'none'

export type UpcomingConfig = { daysBefore: number[] }
export type OverdueConfig = {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
}
export type AlertRuleConfig = UpcomingConfig | OverdueConfig

export const alertRules = pgTable('alert_rules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  scope: text('scope').$type<AlertRuleScope>().notNull(),
  target: text('target').$type<AlertRuleTarget>().notNull().default('transaction'),
  seriesId: text('series_id').references(() => transactionSeries.id, { onDelete: 'cascade' }),
  kind: text('kind').$type<AlertRuleKind>().notNull(),
  config: jsonb('config').$type<AlertRuleConfig>().notNull(),
  channels: json('channels')
    .$type<AlertRuleChannel[]>()
    .notNull()
    .default(['in_app', 'whatsapp', 'extension']),
  recipients: text('recipients').$type<AlertRuleRecipient>().notNull().default('pay_to'),
  active: boolean('active').notNull().default(true),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
