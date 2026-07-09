import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('users_email_unique').on(table.email)]
)
