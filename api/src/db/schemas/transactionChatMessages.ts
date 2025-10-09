import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organization'
import { transactionOccurrences } from './transactionOccurrences'
import { users } from './users'

export const transactionChatMessages = pgTable('transaction_chat_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactionOccurrences.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
