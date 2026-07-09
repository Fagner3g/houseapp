import { createId } from '@paralleldrive/cuid2'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { bigint, boolean, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { organizations } from './organizations'

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment'
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

export const accounts = pgTable(
  'accounts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').$type<AccountType>().notNull(),
    institution: text('institution'),
    currency: text('currency').notNull().default('BRL'),
    creditLimit: bigint('credit_limit', { mode: 'bigint' }),
    closingDay: integer('closing_day'),
    dueDay: integer('due_day'),
    paymentAccountId: text('payment_account_id').references((): AnyPgColumn => accounts.id, {
      onDelete: 'set null',
    }),
    initialBalance: bigint('initial_balance', { mode: 'bigint' }).notNull().default(sql`0`),
    pixKey: text('pix_key'),
    pixKeyType: text('pix_key_type').$type<PixKeyType>(),
    color: text('color'),
    icon: text('icon'),
    displayOrder: integer('display_order').notNull().default(0),
    ofxAccountId: text('ofx_account_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    unique('accounts_organization_id_name_unique').on(table.organizationId, table.name),
    index('idx_accounts_org_ofx_account_id')
      .on(table.organizationId, table.ofxAccountId)
      .where(sql`${table.ofxAccountId} IS NOT NULL`),
  ]
)
