import { createId } from '@paralleldrive/cuid2'
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { accounts } from './accounts'
import { alertRules } from './alertRules'
import { organizations } from './organizations'
import { transactions } from './transactions'
import { users } from './users'

export type NotificationChannel = 'in_app' | 'whatsapp' | 'extension'
export type NotificationStatus = 'pending' | 'sent' | 'read' | 'failed'

export const notifications = pgTable(
  'notifications',
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
    alertRuleId: text('alert_rule_id').references(() => alertRules.id, { onDelete: 'set null' }),
    transactionId: text('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    body: text('body'),
    channel: text('channel').$type<NotificationChannel>().notNull(),
    status: text('status').$type<NotificationStatus>().notNull().default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    dedupeKey: text('dedupe_key').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('notifications_dedupe_key_unique').on(table.dedupeKey),
    index('idx_notifications_user_unread')
      .on(table.userId, table.status)
      .where(sql`${table.status} IN ('pending', 'sent')`),
  ]
)
