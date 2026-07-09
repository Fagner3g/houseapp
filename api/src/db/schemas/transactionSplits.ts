import { createId } from '@paralleldrive/cuid2'
import { bigint, boolean, check, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { transactions } from './transactions'
import { users } from './users'

export type SplitStatus = 'pending' | 'partial' | 'paid' | 'forgiven'

export const transactionSplits = pgTable(
  'transaction_splits',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    contactName: text('contact_name'),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    description: text('description'),
    status: text('status').$type<SplitStatus>().notNull().default('pending'),
    paidAmount: bigint('paid_amount', { mode: 'bigint' }).notNull().default(sql`0`),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    notifyEnabled: boolean('notify_enabled').notNull().default(true),
    isNotified: boolean('is_notified').notNull().default(false),
    lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('idx_splits_transaction').on(table.transactionId),
    index('idx_splits_user_pending')
      .on(table.userId, table.status)
      .where(sql`${table.status} IN ('pending', 'partial')`),
    check(
      'chk_split_has_person',
      sql`${table.userId} IS NOT NULL OR ${table.contactName} IS NOT NULL`
    ),
  ]
)
