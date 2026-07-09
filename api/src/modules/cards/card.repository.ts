import { and, count, eq, inArray, ne } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import {
  cards,
  type CardBlockedReason,
  type CardBrand,
  type CardCanceledReason,
  type CardStatus,
  type CardType,
} from '@/db/schemas/cards'

export type CardRecord = typeof cards.$inferSelect

export type CreateCardData = {
  accountId: string
  label: string
  type: CardType
  brand?: CardBrand | null
  holderName?: string | null
  userId?: string | null
  lastFourDigits?: string | null
  expiresAt?: string | null
  isContactless?: boolean
}

export type UpdateCardData = Partial<
  Omit<CreateCardData, 'accountId' | 'type'> & { type?: CardType }
>

export type CardAccountRef = {
  accountId: string
  accountName: string
}

export interface CardRepository {
  findByAccountId(accountId: string): Promise<CardRecord[]>
  findPrimaryByAccountIds(accountIds: string[]): Promise<Map<string, CardRecord>>
  countActiveByAccountIds(accountIds: string[]): Promise<Map<string, number>>
  findActiveAccountByLastFourDigits(
    organizationId: string,
    lastFourDigits: string
  ): Promise<CardAccountRef | null>
  findById(accountId: string, id: string): Promise<CardRecord | null>
  create(data: CreateCardData): Promise<CardRecord>
  update(id: string, data: UpdateCardData): Promise<CardRecord | null>
  setStatus(
    id: string,
    status: CardStatus,
    extra?: {
      blockedAt?: Date | null
      blockedReason?: CardBlockedReason | null
      canceledAt?: Date | null
      canceledReason?: CardCanceledReason | null
    }
  ): Promise<CardRecord | null>
}

export class DrizzleCardRepository implements CardRepository {
  async findByAccountId(accountId: string): Promise<CardRecord[]> {
    return db
      .select()
      .from(cards)
      .where(and(eq(cards.accountId, accountId), ne(cards.status, 'canceled')))
      .orderBy(cards.createdAt)
  }

  async findPrimaryByAccountIds(accountIds: string[]): Promise<Map<string, CardRecord>> {
    if (!accountIds.length) return new Map()

    const rows = await db
      .select()
      .from(cards)
      .where(and(inArray(cards.accountId, accountIds), ne(cards.status, 'canceled')))
      .orderBy(cards.accountId, cards.createdAt)

    const map = new Map<string, CardRecord>()

    for (const row of rows) {
      const existing = map.get(row.accountId)
      if (!existing) {
        map.set(row.accountId, row)
        continue
      }

      if (existing.type !== 'physical' && row.type === 'physical') {
        map.set(row.accountId, row)
      }
    }

    return map
  }

  async findActiveAccountByLastFourDigits(
    organizationId: string,
    lastFourDigits: string
  ): Promise<CardAccountRef | null> {
    const [row] = await db
      .select({
        accountId: accounts.id,
        accountName: accounts.name,
      })
      .from(cards)
      .innerJoin(accounts, eq(cards.accountId, accounts.id))
      .where(
        and(
          eq(accounts.organizationId, organizationId),
          eq(accounts.isActive, true),
          eq(cards.lastFourDigits, lastFourDigits),
          ne(cards.status, 'canceled')
        )
      )
      .limit(1)

    return row ?? null
  }

  async countActiveByAccountIds(accountIds: string[]): Promise<Map<string, number>> {
    if (!accountIds.length) return new Map()

    const rows = await db
      .select({
        accountId: cards.accountId,
        total: count(),
      })
      .from(cards)
      .where(and(inArray(cards.accountId, accountIds), ne(cards.status, 'canceled')))
      .groupBy(cards.accountId)

    return new Map(rows.map(row => [row.accountId, Number(row.total)]))
  }

  async findById(accountId: string, id: string): Promise<CardRecord | null> {
    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.accountId, accountId)))
      .limit(1)

    return card ?? null
  }

  async create(data: CreateCardData): Promise<CardRecord> {
    const [created] = await db
      .insert(cards)
      .values({
        accountId: data.accountId,
        label: data.label,
        type: data.type,
        brand: data.brand ?? null,
        holderName: data.holderName ?? null,
        userId: data.userId ?? null,
        lastFourDigits: data.lastFourDigits ?? null,
        expiresAt: data.expiresAt ?? null,
        isContactless: data.isContactless ?? true,
      })
      .returning()

    return created
  }

  async update(id: string, data: UpdateCardData): Promise<CardRecord | null> {
    const [updated] = await db
      .update(cards)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, id))
      .returning()

    return updated ?? null
  }

  async setStatus(
    id: string,
    status: CardStatus,
    extra?: {
      blockedAt?: Date | null
      blockedReason?: CardBlockedReason | null
      canceledAt?: Date | null
      canceledReason?: CardCanceledReason | null
    }
  ): Promise<CardRecord | null> {
    const [updated] = await db
      .update(cards)
      .set({
        status,
        blockedAt: extra?.blockedAt,
        blockedReason: extra?.blockedReason,
        canceledAt: extra?.canceledAt,
        canceledReason: extra?.canceledReason,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, id))
      .returning()

    return updated ?? null
  }
}
