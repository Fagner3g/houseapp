import { createId } from '@paralleldrive/cuid2'
import { bigint, boolean, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { accounts } from './accounts'
import { organizations } from './organizations'
import { users } from './users'

export type StatementImportSource = 'pdf' | 'csv' | 'ofx'

export const statements = pgTable(
  'statements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    closingDate: timestamp('closing_date', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    totalAmount: bigint('total_amount', { mode: 'bigint' }),
    minimumPayment: bigint('minimum_payment', { mode: 'bigint' }),
    previousBalance: bigint('previous_balance', { mode: 'bigint' }),
    paymentsReceived: bigint('payments_received', { mode: 'bigint' }),
    purchasesTotal: bigint('purchases_total', { mode: 'bigint' }),
    otherCharges: bigint('other_charges', { mode: 'bigint' }),
    nextInvoiceBalance: bigint('next_invoice_balance', { mode: 'bigint' }),
    totalOpenBalance: bigint('total_open_balance', { mode: 'bigint' }),
    transactionsCount: integer('transactions_count').notNull().default(0),
    fileHash: text('file_hash').notNull(),
    fileName: text('file_name'),
    importSource: text('import_source').$type<StatementImportSource>(),
    isClosed: boolean('is_closed').notNull().default(false),
    isPaid: boolean('is_paid').notNull().default(false),
    importedBy: text('imported_by').references(() => users.id),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [unique('statements_file_hash_account_id_unique').on(table.fileHash, table.accountId)]
)
