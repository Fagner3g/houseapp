import { createId } from '@paralleldrive/cuid2'
import { jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { alertRules } from './alertRules'
import { customReminders } from './customReminders'
import { organizations } from './organization'
import { users } from './users'

export type AlertSourceType = 'rule' | 'reminder' | 'investment'
export type AlertChannel = 'in_app' | 'whatsapp' | 'extension'
export type AlertDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export const alertDeliveries = pgTable(
  'alert_deliveries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    sourceType: text('source_type').$type<AlertSourceType>().notNull(),
    ruleId: text('rule_id').references(() => alertRules.id, { onDelete: 'set null' }),
    reminderId: text('reminder_id').references(() => customReminders.id, {
      onDelete: 'cascade',
    }),
    occurrenceId: text('occurrence_id'),
    kind: text('kind').notNull(),
    channel: text('channel').$type<AlertChannel>().notNull(),
    status: text('status').$type<AlertDeliveryStatus>().notNull().default('pending'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    ackedAt: timestamp('acked_at', { withTimezone: true }),
    dedupeKey: text('dedupe_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [unique().on(table.dedupeKey)]
)
