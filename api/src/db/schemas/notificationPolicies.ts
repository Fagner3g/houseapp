import { pgTable, serial, text, varchar, integer, boolean, numeric, time, timestamp, index } from 'drizzle-orm/pg-core'

/** Notification policies configuration */
export const notificationPolicies = pgTable(
  'notification_policies',
  {
    id: serial('id').primaryKey(),
    orgId: varchar('org_id').notNull(),
    scope: varchar('scope', { length: 16 }).notNull(),
    event: varchar('event', { length: 16 }).notNull(),
    daysBefore: integer('days_before'),
    daysOverdue: integer('days_overdue'),
    repeatEveryMinutes: integer('repeat_every_minutes'),
    maxOccurrences: integer('max_occurrences'),
    channels: varchar('channels', { length: 64 }).notNull(),
    typeFilter: varchar('type_filter', { length: 16 }),
    categoryId: varchar('category_id'),
    amountMin: numeric('amount_min'),
    amountMax: numeric('amount_max'),
    quietHoursStart: time('quiet_hours_start'),
    quietHoursEnd: time('quiet_hours_end'),
    timezone: varchar('timezone', { length: 64 }).default('America/Sao_Paulo'),
    weekdaysMask: integer('weekdays_mask').default(127),
    active: boolean('active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  table => ({
    orgIdx: index('notification_policies_org_idx').on(table.orgId),
  })
)

export type NotificationScope = 'transaction' | 'goal'
export type NotificationEvent = 'due_soon' | 'overdue'
