import { boolean, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { users } from './users'

export type AlertPreferences = {
  whatsapp: boolean
  inApp: boolean
  extension: boolean
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  whatsapp: true,
  inApp: true,
  extension: true,
}

export const userOrganizations = pgTable(
  'user_organizations',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
    alertPreferences: jsonb('alert_preferences')
      .$type<AlertPreferences>()
      .notNull()
      .default(DEFAULT_ALERT_PREFERENCES),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [unique().on(table.userId, table.organizationId)]
)
