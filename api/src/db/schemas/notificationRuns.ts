import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { notificationPolicies } from './notificationPolicies'

export const notificationRuns = pgTable('notification_runs', {
  id: serial('id').primaryKey(),
  policyId: integer('policy_id')
    .references(() => notificationPolicies.id, { onDelete: 'cascade' }),
  resourceType: varchar('resource_type', { length: 16 }),
  resourceId: text('resource_id'),
  channel: varchar('channel', { length: 16 }),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 16 }),
  error: text('error'),
})
