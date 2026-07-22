import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/** Singleton row (`id = 'default'`) for platform-wide runtime flags. */
export const SYSTEM_SETTINGS_ID = 'default' as const

export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey(),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})