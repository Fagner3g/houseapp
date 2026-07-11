import { and, eq, isNull, lt, lte, or } from 'drizzle-orm'

import { db } from '@/db'
import {
  recurringTransactions,
  type RecurringFrequency,
  type RecurringTransactionType,
} from '@/db/schemas/recurringTransactions'

export type RecurringRecord = typeof recurringTransactions.$inferSelect

export type CreateRecurringData = {
  organizationId: string
  accountId?: string | null
  title: string
  amount: bigint
  type: RecurringTransactionType
  counterparty?: string | null
  categoryId?: string | null
  frequency: RecurringFrequency
  interval?: number
  startDate: Date
  endDate?: Date | null
  installmentsTotal?: number | null
}

export type UpdateRecurringData = Partial<
  Omit<CreateRecurringData, 'organizationId'>
> & {
  isActive?: boolean
  lastGeneratedDate?: Date | null
}

export interface RecurringRepository {
  findAllByOrganization(organizationId: string): Promise<RecurringRecord[]>
  findById(organizationId: string, id: string): Promise<RecurringRecord | null>
  findActiveForMaterialization(): Promise<RecurringRecord[]>
  create(data: CreateRecurringData): Promise<RecurringRecord>
  update(id: string, data: UpdateRecurringData): Promise<RecurringRecord | null>
  softDelete(id: string): Promise<RecurringRecord | null>
}

export class DrizzleRecurringRepository implements RecurringRepository {
  async findAllByOrganization(organizationId: string): Promise<RecurringRecord[]> {
    return db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.organizationId, organizationId),
          eq(recurringTransactions.isActive, true)
        )
      )
      .orderBy(recurringTransactions.title)
  }

  async findById(organizationId: string, id: string): Promise<RecurringRecord | null> {
    const [row] = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.organizationId, organizationId)
        )
      )
      .limit(1)

    return row ?? null
  }

  async findActiveForMaterialization(): Promise<RecurringRecord[]> {
    const today = startOfDay(new Date())

    return db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.isActive, true),
          lte(recurringTransactions.startDate, today),
          or(
            isNull(recurringTransactions.lastGeneratedDate),
            lt(recurringTransactions.lastGeneratedDate, today)
          )
        )
      )
  }

  async create(data: CreateRecurringData): Promise<RecurringRecord> {
    const [created] = await db
      .insert(recurringTransactions)
      .values({
        organizationId: data.organizationId,
        accountId: data.accountId ?? null,
        title: data.title,
        amount: data.amount,
        type: data.type,
        counterparty: data.counterparty ?? null,
        categoryId: data.categoryId ?? null,
        frequency: data.frequency,
        interval: data.interval ?? 1,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        installmentsTotal: data.installmentsTotal ?? null,
      })
      .returning()

    return created
  }

  async update(id: string, data: UpdateRecurringData): Promise<RecurringRecord | null> {
    const [updated] = await db
      .update(recurringTransactions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, id))
      .returning()

    return updated ?? null
  }

  async softDelete(id: string): Promise<RecurringRecord | null> {
    const [updated] = await db
      .update(recurringTransactions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))
      .returning()

    return updated ?? null
  }
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0)
  )
}
