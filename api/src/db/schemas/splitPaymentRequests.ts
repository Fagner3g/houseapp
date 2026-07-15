import { createId } from '@paralleldrive/cuid2'
import { bigint, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { organizations } from './organizations'
import { transactionSplits } from './transactionSplits'
import { transactions } from './transactions'
import { users } from './users'

export type SplitPaymentRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export const splitPaymentRequests = pgTable(
  'split_payment_requests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    splitId: text('split_id')
      .notNull()
      .references(() => transactionSplits.id, { onDelete: 'cascade' }),
    requestedByUserId: text('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    note: text('note'),
    status: text('status').$type<SplitPaymentRequestStatus>().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  table => [
    uniqueIndex('split_payment_requests_pending_split_unique')
      .on(table.splitId)
      .where(sql`${table.status} = 'pending'`),
    index('idx_split_payment_requests_recipient_pending')
      .on(table.recipientUserId, table.status)
      .where(sql`${table.status} = 'pending'`),
  ]
)
