import { createId } from '@paralleldrive/cuid2'
import { bigint, boolean, integer, json, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { transactionSeries } from './transactionSeries'
import { users } from './users'

export type ReminderChannel = 'in_app' | 'whatsapp' | 'extension'
export type ReminderRecurrenceType = 'weekly' | 'monthly' | 'yearly'

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
