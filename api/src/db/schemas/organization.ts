import { createId } from '@paralleldrive/cuid2'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { users } from './users'

export const organizations = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  defaultNotifyHour: integer('default_notify_hour').notNull().default(9),
  defaultNotifyMinute: integer('default_notify_minute').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
