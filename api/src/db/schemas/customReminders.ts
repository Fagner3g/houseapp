import { createId } from '@paralleldrive/cuid2'
import { bigint, boolean, integer, json, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { transactionSeries } from './transactionSeries'
import { users } from './users'

export type ReminderChannel = 'in_app' | 'whatsapp' | 'extension'
export type ReminderRecurrenceType = 'weekly' | 'monthly' | 'yearly'

export type ReminderTransactionType = 'expense' | 'income'

export const customReminders = pgTable('custom_reminders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  notes: text('notes'),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  amountCents: bigint('amount_cents', { mode: 'bigint' }),
  daysBefore: json('days_before').$type<number[]>().notNull().default([1, 0]),
  useOrgAlertDefaults: boolean('use_org_alert_defaults').notNull().default(true),
  overdueAlertFrequency: text('overdue_alert_frequency').$type<
    'daily' | 'weekly' | 'monthly' | null
  >(),
  overdueAlertInterval: integer('overdue_alert_interval').notNull().default(1),
  channels: json('channels')
    .$type<ReminderChannel[]>()
    .notNull()
    .default(['in_app', 'whatsapp', 'extension']),
  recipientUserId: text('recipient_user_id')
    .notNull()
    .references(() => users.id),
  active: boolean('active').notNull().default(true),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceType: text('recurrence_type').$type<ReminderRecurrenceType | null>(),
  recurrenceInterval: integer('recurrence_interval').notNull().default(1),
  recurrenceUntil: timestamp('recurrence_until', { withTimezone: true }),
  notifyHour: integer('notify_hour'),
  notifyMinute: integer('notify_minute'),
  linkedSeriesId: text('linked_series_id').references(() => transactionSeries.id, {
    onDelete: 'set null',
  }),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  lastCompletedPeriodKey: text('last_completed_period_key'),
  generatesTransaction: boolean('generates_transaction').notNull().default(false),
  defaultPayToId: text('default_pay_to_id').references(() => users.id, { onDelete: 'set null' }),
  transactionType: text('transaction_type')
    .$type<ReminderTransactionType>()
    .notNull()
    .default('expense'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
