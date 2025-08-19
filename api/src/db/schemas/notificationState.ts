import { pgTable, serial, integer, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { notificationPolicies } from './notificationPolicies'

export const notificationState = pgTable(
  'notification_state',
  {
    id: serial('id').primaryKey(),
    policyId: integer('policy_id')
      .notNull()
      .references(() => notificationPolicies.id, { onDelete: 'cascade' }),
    resourceType: varchar('resource_type', { length: 16 }).notNull(),
    resourceId: text('resource_id').notNull(),
    lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),
    occurrences: integer('occurrences').default(0),
    nextEligibleAt: timestamp('next_eligible_at', { withTimezone: true }),
    status: varchar('status', { length: 16 }).default('ok'),
  },
  table => ({
    policyResourceIdx: uniqueIndex('notification_state_policy_resource_idx').on(
      table.policyId,
      table.resourceType,
      table.resourceId,
    ),
  }),
)
