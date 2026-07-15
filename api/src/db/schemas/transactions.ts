import { createId } from '@paralleldrive/cuid2'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { accounts } from './accounts'
import { cards } from './cards'
import { organizations } from './organizations'
import { recurringTransactions } from './recurringTransactions'
import { statements } from './statements'
import { users } from './users'

export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionStatus = 'pending' | 'partial' | 'paid' | 'canceled'
export type TransactionSource = 'manual' | 'import' | 'recurring' | 'ai_chat'
export type NotifyTargetType = 'member' | 'contact'

export type TransactionNotifyOverdueConfig =
  | { frequency: 'daily' | 'weekly' | 'monthly'; interval: number }
  | { disabled: true }

export const transactions = pgTable(
  'transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    cardId: text('card_id').references(() => cards.id, { onDelete: 'set null' }),
    recurringTransactionId: text('recurring_transaction_id').references(
      () => recurringTransactions.id,
      { onDelete: 'set null' }
    ),
    statementId: text('statement_id').references(() => statements.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    amount: bigint('amount', { mode: 'bigint' }),
    type: text('type').$type<TransactionType>().notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    competenceDate: timestamp('competence_date', { withTimezone: true }),
    status: text('status').$type<TransactionStatus>().notNull().default('pending'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidAmount: bigint('paid_amount', { mode: 'bigint' }),
    paymentScheduledAt: timestamp('payment_scheduled_at', { withTimezone: true }),
    counterparty: text('counterparty'),
    installmentNumber: integer('installment_number'),
    installmentsTotal: integer('installments_total'),
    source: text('source').$type<TransactionSource>().notNull().default('manual'),
    externalId: text('external_id'),
    transferPairId: text('transfer_pair_id').references((): AnyPgColumn => transactions.id),
    notifyEnabled: boolean('notify_enabled').notNull().default(false),
    notifyTargetType: text('notify_target_type').$type<NotifyTargetType | null>(),
    notifyUserId: text('notify_user_id').references(() => users.id, { onDelete: 'set null' }),
    notifyContactName: text('notify_contact_name'),
    notifyContactPhone: text('notify_contact_phone'),
    notifyDaysBefore: jsonb('notify_days_before').$type<number[] | null>(),
    notifyOverdueConfig: jsonb('notify_overdue_config').$type<TransactionNotifyOverdueConfig | null>(),
    notifyLastNotifiedAt: timestamp('notify_last_notified_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    check(
      'chk_transaction_notify_target',
      sql`NOT ${table.notifyEnabled} OR (
        ${table.notifyTargetType} = 'member' AND ${table.notifyUserId} IS NOT NULL
      ) OR (
        ${table.notifyTargetType} = 'contact' AND ${table.notifyContactName} IS NOT NULL
      )`
    ),
    index('idx_transactions_org_date').on(table.organizationId, table.date),
    index('idx_transactions_account_date').on(table.accountId, table.date),
    index('idx_transactions_card')
      .on(table.cardId)
      .where(sql`${table.cardId} IS NOT NULL`),
    index('idx_transactions_created_by')
      .on(table.createdBy)
      .where(sql`${table.createdBy} IS NOT NULL`),
    index('idx_transactions_status')
      .on(table.organizationId, table.status)
      .where(sql`${table.status} IN ('pending', 'partial')`),
    uniqueIndex('idx_transactions_external_dedup')
      .on(table.accountId, table.externalId)
      .where(sql`${table.externalId} IS NOT NULL`),
  ]
)
