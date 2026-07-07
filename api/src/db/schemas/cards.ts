import { createId } from '@paralleldrive/cuid2'
import { boolean, date, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { accounts } from './accounts'
import { users } from './users'

export type CardType = 'physical' | 'virtual' | 'additional'
export type CardStatus = 'active' | 'blocked' | 'canceled'
export type CardBlockedReason = 'fraud' | 'lost' | 'stolen' | 'preventive'
export type CardCanceledReason =
  | 'fraud'
  | 'lost'
  | 'stolen'
  | 'requested'
  | 'expired'
  | 'upgrade'
export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex'

export const cards = pgTable(
  'cards',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    lastFourDigits: text('last_four_digits'),
    type: text('type').$type<CardType>().notNull(),
    holderName: text('holder_name'),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    brand: text('brand').$type<CardBrand>(),
    status: text('status').$type<CardStatus>().notNull().default('active'),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    blockedReason: text('blocked_reason').$type<CardBlockedReason>(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    canceledReason: text('canceled_reason').$type<CardCanceledReason>(),
    expiresAt: date('expires_at'),
    isContactless: boolean('is_contactless').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [index('idx_cards_account').on(table.accountId)]
)
