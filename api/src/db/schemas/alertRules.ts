import { createId } from '@paralleldrive/cuid2'
import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { accounts } from './accounts'
import { organizations } from './organizations'
import { recurringTransactions } from './recurringTransactions'
import { users } from './users'

export type AlertRuleScope = 'organization' | 'account' | 'recurring'
export type AlertRuleTriggerType = 'upcoming' | 'overdue'
export type AlertRuleChannel = 'in_app' | 'whatsapp' | 'extension'

export type UpcomingAlertConfig = { daysBefore: number[] }
export type OverdueAlertConfig = {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
}
export type AlertRuleConfig = UpcomingAlertConfig | OverdueAlertConfig

export const alertRules = pgTable(
  'alert_rules',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    scope: text('scope').$type<AlertRuleScope>().notNull(),
    accountId: text('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
    recurringTransactionId: text('recurring_transaction_id').references(
      () => recurringTransactions.id,
      { onDelete: 'cascade' }
    ),
    triggerType: text('trigger_type').$type<AlertRuleTriggerType>().notNull(),
    config: jsonb('config').$type<AlertRuleConfig>().notNull(),
    channels: jsonb('channels')
      .$type<AlertRuleChannel[]>()
      .notNull()
      .default(['in_app']),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('idx_alert_rules_org')
      .on(table.organizationId, table.triggerType)
      .where(sql`${table.scope} = 'organization' AND ${table.isActive} = true`),
    uniqueIndex('idx_alert_rules_account')
      .on(table.accountId, table.triggerType)
      .where(
        sql`${table.scope} = 'account' AND ${table.isActive} = true AND ${table.accountId} IS NOT NULL`
      ),
    uniqueIndex('idx_alert_rules_recurring')
      .on(table.recurringTransactionId, table.triggerType)
      .where(
        sql`${table.scope} = 'recurring' AND ${table.isActive} = true AND ${table.recurringTransactionId} IS NOT NULL`
      ),
  ]
)
