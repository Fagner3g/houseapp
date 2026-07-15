import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactionCategories } from '@/db/schemas/transactionCategories'
import {
  transactions,
  type NotifyTargetType,
  type TransactionNotifyOverdueConfig,
  type TransactionSource,
  type TransactionStatus,
  type TransactionType,
} from '@/db/schemas/transactions'
import { UNPAID_TRANSACTION_STATUSES } from '@/core/transaction-payment'
import { userOwnsTransactionCondition } from '@/modules/splits/split-expense-attribution'
import {
  isOverduePayableListFilter,
  isPayableTransactionCondition,
  isNotScheduledForFutureCondition,
  isScheduledOnlyCondition,
  matchesOverdueDueDateCondition,
  matchesPayablePeriodCondition,
  shouldExcludeFutureScheduled,
} from './payable-transaction'
import {
  transactionVisibilityCondition,
  type TransactionViewer,
} from './transaction-visibility'

export type TransactionRecord = typeof transactions.$inferSelect

export type CreateTransactionData = {
  organizationId: string
  accountId?: string | null
  cardId?: string | null
  recurringTransactionId?: string | null
  statementId?: string | null
  title: string
  description?: string | null
  amount?: bigint | null
  type: TransactionType
  date: Date
  competenceDate?: Date | null
  status?: TransactionStatus
  paidAt?: Date | null
  paidAmount?: bigint | null
  counterparty?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  source?: TransactionSource
  externalId?: string | null
  transferPairId?: string | null
  createdBy?: string | null
  categoryIds?: string[]
  notifyEnabled?: boolean
  notifyTargetType?: NotifyTargetType | null
  notifyUserId?: string | null
  notifyContactName?: string | null
  notifyContactPhone?: string | null
  notifyDaysBefore?: number[] | null
  notifyOverdueConfig?: TransactionNotifyOverdueConfig | null
}

export type UpdateTransactionData = Partial<
  Omit<CreateTransactionData, 'organizationId' | 'categoryIds'>
> & {
  categoryIds?: string[]
  transferPairId?: string | null
  paymentScheduledAt?: Date | null
}

export type TransactionSortBy = 'date' | 'purchaseDate'
export type TransactionSortOrder = 'asc' | 'desc'

export type ListTransactionsFilter = {
  organizationId: string
  accountId?: string
  categoryId?: string
  status?: TransactionStatus
  type?: TransactionType
  dateFrom?: Date
  dateTo?: Date
  search?: string
  page?: number
  perPage?: number
  /** Excludes credit card purchases (pay the invoice instead). */
  payableOnly?: boolean
  /** Only pending/partial with future paymentScheduledAt. Implies payableOnly. */
  scheduledOnly?: boolean
  /** Only transactions attributed to the viewer as payer. */
  ownedOnly?: boolean
  sortBy?: TransactionSortBy
  sortOrder?: TransactionSortOrder
  viewer?: TransactionViewer
}

export type ListTransactionsResult = {
  rows: TransactionRecord[]
  categoryIdsByTransaction: Map<string, string[]>
  total: number
}

export interface TransactionRepository {
  findMany(filter: ListTransactionsFilter): Promise<ListTransactionsResult>
  findById(
    organizationId: string,
    id: string,
    viewer?: TransactionViewer
  ): Promise<TransactionRecord | null>
  findByIdGlobal(id: string): Promise<TransactionRecord | null>
  create(data: CreateTransactionData): Promise<TransactionRecord>
  createMany(data: CreateTransactionData[]): Promise<TransactionRecord[]>
  createTransferPair(
    from: CreateTransactionData,
    to: CreateTransactionData
  ): Promise<{ from: TransactionRecord; to: TransactionRecord }>
  update(id: string, data: UpdateTransactionData): Promise<TransactionRecord | null>
  delete(id: string): Promise<TransactionRecord | null>
  deleteWithTransferPair(id: string, pairId: string | null): Promise<void>
  setCategories(transactionId: string, categoryIds: string[]): Promise<void>
  getCategoryIds(transactionIds: string[]): Promise<Map<string, string[]>>
  updateMany(
    organizationId: string,
    updates: Array<{ id: string; data: UpdateTransactionData }>
  ): Promise<TransactionRecord[]>
  findManualInstallmentRows(
    organizationId: string,
    accountId: string
  ): Promise<TransactionRecord[]>
  findByRecurringId(organizationId: string, recurringId: string): Promise<TransactionRecord[]>
  updatePendingFromDate(
    organizationId: string,
    recurringId: string,
    effectiveFrom: Date,
    data: {
      amount?: bigint
      title?: string
      accountId?: string | null
      counterparty?: string | null
      categoryId?: string | null
    }
  ): Promise<number>
}

function transactionDateForFilter(filter: ListTransactionsFilter) {
  // Payable entries use `date` as due date; credit card purchase lists use competence date when set.
  if (filter.payableOnly) {
    return transactions.date
  }

  return sql`COALESCE(${transactions.competenceDate}, ${transactions.date})`
}

function buildWhereConditions(filter: ListTransactionsFilter) {
  const conditions = [eq(transactions.organizationId, filter.organizationId)]
  const dateField = transactionDateForFilter(filter)

  const visibility = transactionVisibilityCondition(filter.viewer)
  if (visibility) {
    conditions.push(visibility)
  }

  if (filter.ownedOnly && filter.viewer) {
    conditions.push(
      userOwnsTransactionCondition(filter.viewer.userId, filter.viewer.ownerId)
    )
  }

  if (filter.accountId) {
    conditions.push(eq(transactions.accountId, filter.accountId))
  }

  const overduePayableList = isOverduePayableListFilter(filter)

  if (filter.status) {
    conditions.push(eq(transactions.status, filter.status))
  } else if (overduePayableList) {
    conditions.push(inArray(transactions.status, [...UNPAID_TRANSACTION_STATUSES]))
  }

  if (filter.type) {
    conditions.push(eq(transactions.type, filter.type))
  }

  if (overduePayableList && filter.dateTo) {
    conditions.push(matchesOverdueDueDateCondition(filter.dateTo))
  } else if (filter.payableOnly && (filter.dateFrom || filter.dateTo)) {
    const periodMatch = matchesPayablePeriodCondition(filter.dateFrom, filter.dateTo)
    if (periodMatch) conditions.push(periodMatch)
  } else {
    if (filter.dateFrom) {
      conditions.push(
        sql`${dateField} >= ${filter.dateFrom.toISOString()}::timestamptz`
      )
    }

    if (filter.dateTo) {
      conditions.push(
        sql`${dateField} <= ${filter.dateTo.toISOString()}::timestamptz`
      )
    }
  }

  if (filter.search) {
    const pattern = `%${filter.search}%`
    conditions.push(
      or(
        ilike(transactions.title, pattern),
        ilike(transactions.description, pattern),
        ilike(transactions.counterparty, pattern)
      ) as SQL
    )
  }

  return conditions
}

function buildOrderBy(
  sortBy: TransactionSortBy = 'date',
  sortOrder: TransactionSortOrder = 'desc'
) {
  const direction = sortOrder === 'asc' ? asc : desc

  if (sortBy === 'purchaseDate') {
    return [
      direction(sql`COALESCE(${transactions.competenceDate}, ${transactions.date})`),
      asc(transactions.title),
    ]
  }

  return [direction(transactions.date), desc(transactions.createdAt)]
}

export class DrizzleTransactionRepository implements TransactionRepository {
  async findMany(filter: ListTransactionsFilter): Promise<ListTransactionsResult> {
    const page = filter.page ?? 1
    const perPage = filter.perPage ?? 20
    const offset = (page - 1) * perPage
    const conditions = buildWhereConditions(filter)

    if (filter.categoryId) {
      conditions.push(
        sql`${transactions.id} IN (
          SELECT ${transactionCategories.transactionId}
          FROM ${transactionCategories}
          WHERE ${transactionCategories.categoryId} = ${filter.categoryId}
        )`
      )
    }

    const whereClause = and(...conditions)
    const orderBy = buildOrderBy(filter.sortBy, filter.sortOrder)
    const needsOwnershipJoins = Boolean(filter.ownedOnly)

    const payableWhere = and(
      whereClause,
      isPayableTransactionCondition(),
      filter.scheduledOnly ? isScheduledOnlyCondition() : undefined,
      !filter.scheduledOnly && shouldExcludeFutureScheduled(filter)
        ? isNotScheduledForFutureCondition()
        : undefined
    )

    const usePayableQuery = filter.payableOnly || filter.scheduledOnly

    const [countRow] = usePayableQuery
      ? await db
          .select({ total: count() })
          .from(transactions)
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(cards, eq(transactions.cardId, cards.id))
          .where(payableWhere)
      : needsOwnershipJoins
        ? await db
            .select({ total: count() })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .leftJoin(cards, eq(transactions.cardId, cards.id))
            .where(whereClause)
        : await db
            .select({ total: count() })
            .from(transactions)
            .where(whereClause)

    const rows = usePayableQuery
      ? await db
          .select({
            id: transactions.id,
            organizationId: transactions.organizationId,
            accountId: transactions.accountId,
            cardId: transactions.cardId,
            recurringTransactionId: transactions.recurringTransactionId,
            statementId: transactions.statementId,
            title: transactions.title,
            description: transactions.description,
            amount: transactions.amount,
            type: transactions.type,
            date: transactions.date,
            competenceDate: transactions.competenceDate,
            status: transactions.status,
            paidAt: transactions.paidAt,
            paidAmount: transactions.paidAmount,
            paymentScheduledAt: transactions.paymentScheduledAt,
            counterparty: transactions.counterparty,
            installmentNumber: transactions.installmentNumber,
            installmentsTotal: transactions.installmentsTotal,
            source: transactions.source,
            externalId: transactions.externalId,
            transferPairId: transactions.transferPairId,
            notifyEnabled: transactions.notifyEnabled,
            notifyTargetType: transactions.notifyTargetType,
            notifyUserId: transactions.notifyUserId,
            notifyContactName: transactions.notifyContactName,
            notifyContactPhone: transactions.notifyContactPhone,
            notifyDaysBefore: transactions.notifyDaysBefore,
            notifyOverdueConfig: transactions.notifyOverdueConfig,
            notifyLastNotifiedAt: transactions.notifyLastNotifiedAt,
            createdBy: transactions.createdBy,
            createdAt: transactions.createdAt,
            updatedAt: transactions.updatedAt,
          })
          .from(transactions)
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(cards, eq(transactions.cardId, cards.id))
          .where(payableWhere)
          .orderBy(...orderBy)
          .limit(perPage)
          .offset(offset)
      : needsOwnershipJoins
        ? await db
            .select({
              id: transactions.id,
              organizationId: transactions.organizationId,
              accountId: transactions.accountId,
              cardId: transactions.cardId,
              recurringTransactionId: transactions.recurringTransactionId,
              statementId: transactions.statementId,
              title: transactions.title,
              description: transactions.description,
              amount: transactions.amount,
              type: transactions.type,
              date: transactions.date,
              competenceDate: transactions.competenceDate,
              status: transactions.status,
              paidAt: transactions.paidAt,
              paidAmount: transactions.paidAmount,
              paymentScheduledAt: transactions.paymentScheduledAt,
              counterparty: transactions.counterparty,
              installmentNumber: transactions.installmentNumber,
              installmentsTotal: transactions.installmentsTotal,
              source: transactions.source,
              externalId: transactions.externalId,
              transferPairId: transactions.transferPairId,
              notifyEnabled: transactions.notifyEnabled,
              notifyTargetType: transactions.notifyTargetType,
              notifyUserId: transactions.notifyUserId,
              notifyContactName: transactions.notifyContactName,
              notifyContactPhone: transactions.notifyContactPhone,
              notifyDaysBefore: transactions.notifyDaysBefore,
              notifyOverdueConfig: transactions.notifyOverdueConfig,
              notifyLastNotifiedAt: transactions.notifyLastNotifiedAt,
              createdBy: transactions.createdBy,
              createdAt: transactions.createdAt,
              updatedAt: transactions.updatedAt,
            })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .leftJoin(cards, eq(transactions.cardId, cards.id))
            .where(whereClause)
            .orderBy(...orderBy)
            .limit(perPage)
            .offset(offset)
        : await db
            .select()
            .from(transactions)
            .where(whereClause)
            .orderBy(...orderBy)
            .limit(perPage)
            .offset(offset)

    const categoryIdsByTransaction = await this.getCategoryIds(rows.map(row => row.id))

    return {
      rows,
      categoryIdsByTransaction,
      total: countRow?.total ?? 0,
    }
  }

  async findById(
    organizationId: string,
    id: string,
    viewer?: TransactionViewer
  ): Promise<TransactionRecord | null> {
    const conditions = [
      eq(transactions.id, id),
      eq(transactions.organizationId, organizationId),
    ]
    const visibility = transactionVisibilityCondition(viewer)
    if (visibility) {
      conditions.push(visibility)
    }

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .limit(1)

    return transaction ?? null
  }

  async findByIdGlobal(id: string): Promise<TransactionRecord | null> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)

    return transaction ?? null
  }

  async create(data: CreateTransactionData): Promise<TransactionRecord> {
    const { categoryIds, ...transactionData } = data

    return db.transaction(async tx => {
      const [created] = await tx
        .insert(transactions)
        .values({
          organizationId: transactionData.organizationId,
          accountId: transactionData.accountId ?? null,
          cardId: transactionData.cardId ?? null,
          recurringTransactionId: transactionData.recurringTransactionId ?? null,
          statementId: transactionData.statementId ?? null,
          title: transactionData.title,
          description: transactionData.description ?? null,
          amount: transactionData.amount ?? null,
          type: transactionData.type,
          date: transactionData.date,
          competenceDate: transactionData.competenceDate ?? null,
          status: transactionData.status ?? 'pending',
          paidAt: transactionData.paidAt ?? null,
          paidAmount: transactionData.paidAmount ?? null,
          counterparty: transactionData.counterparty ?? null,
          installmentNumber: transactionData.installmentNumber ?? null,
          installmentsTotal: transactionData.installmentsTotal ?? null,
          source: transactionData.source ?? 'manual',
          externalId: transactionData.externalId ?? null,
          transferPairId: transactionData.transferPairId ?? null,
          notifyEnabled: transactionData.notifyEnabled ?? false,
          notifyTargetType: transactionData.notifyTargetType ?? null,
          notifyUserId: transactionData.notifyUserId ?? null,
          notifyContactName: transactionData.notifyContactName ?? null,
          notifyContactPhone: transactionData.notifyContactPhone ?? null,
          notifyDaysBefore: transactionData.notifyDaysBefore ?? null,
          notifyOverdueConfig: transactionData.notifyOverdueConfig ?? null,
          createdBy: transactionData.createdBy ?? null,
        })
        .returning()

      if (categoryIds?.length) {
        await tx.insert(transactionCategories).values(
          categoryIds.map(categoryId => ({
            transactionId: created.id,
            categoryId,
          }))
        )
      }

      return created
    })
  }

  async createMany(data: CreateTransactionData[]): Promise<TransactionRecord[]> {
    if (data.length === 0) return []

    return db.transaction(async tx => {
      const createdRows: TransactionRecord[] = []

      for (const item of data) {
        const { categoryIds, ...transactionData } = item

        const [created] = await tx
          .insert(transactions)
          .values({
            organizationId: transactionData.organizationId,
            accountId: transactionData.accountId ?? null,
            cardId: transactionData.cardId ?? null,
            recurringTransactionId: transactionData.recurringTransactionId ?? null,
            statementId: transactionData.statementId ?? null,
            title: transactionData.title,
            description: transactionData.description ?? null,
            amount: transactionData.amount ?? null,
            type: transactionData.type,
            date: transactionData.date,
            competenceDate: transactionData.competenceDate ?? null,
            status: transactionData.status ?? 'pending',
            paidAt: transactionData.paidAt ?? null,
            paidAmount: transactionData.paidAmount ?? null,
            counterparty: transactionData.counterparty ?? null,
            installmentNumber: transactionData.installmentNumber ?? null,
            installmentsTotal: transactionData.installmentsTotal ?? null,
            source: transactionData.source ?? 'manual',
            externalId: transactionData.externalId ?? null,
            transferPairId: transactionData.transferPairId ?? null,
            notifyEnabled: transactionData.notifyEnabled ?? false,
            notifyTargetType: transactionData.notifyTargetType ?? null,
            notifyUserId: transactionData.notifyUserId ?? null,
            notifyContactName: transactionData.notifyContactName ?? null,
            notifyContactPhone: transactionData.notifyContactPhone ?? null,
            notifyDaysBefore: transactionData.notifyDaysBefore ?? null,
            notifyOverdueConfig: transactionData.notifyOverdueConfig ?? null,
            createdBy: transactionData.createdBy ?? null,
          })
          .returning()

        if (categoryIds?.length) {
          await tx.insert(transactionCategories).values(
            categoryIds.map(categoryId => ({
              transactionId: created.id,
              categoryId,
            }))
          )
        }

        createdRows.push(created)
      }

      return createdRows
    })
  }

  async createTransferPair(
    from: CreateTransactionData,
    to: CreateTransactionData
  ): Promise<{ from: TransactionRecord; to: TransactionRecord }> {
    return db.transaction(async tx => {
      const [expense] = await tx
        .insert(transactions)
        .values({
          organizationId: from.organizationId,
          accountId: from.accountId ?? null,
          title: from.title,
          description: from.description ?? null,
          amount: from.amount ?? null,
          type: 'expense',
          date: from.date,
          status: from.status ?? 'paid',
          paidAt: from.paidAt ?? from.date,
          paidAmount: from.paidAmount ?? from.amount ?? null,
          source: from.source ?? 'manual',
          createdBy: from.createdBy ?? null,
        })
        .returning()

      const [income] = await tx
        .insert(transactions)
        .values({
          organizationId: to.organizationId,
          accountId: to.accountId ?? null,
          title: to.title,
          description: to.description ?? null,
          amount: to.amount ?? null,
          type: 'income',
          date: to.date,
          status: to.status ?? 'paid',
          paidAt: to.paidAt ?? to.date,
          paidAmount: to.paidAmount ?? to.amount ?? null,
          source: to.source ?? 'manual',
          transferPairId: expense.id,
          createdBy: to.createdBy ?? null,
        })
        .returning()

      const [linkedExpense] = await tx
        .update(transactions)
        .set({ transferPairId: income.id, updatedAt: new Date() })
        .where(eq(transactions.id, expense.id))
        .returning()

      if (!linkedExpense) {
        throw new Error('Failed to link transfer pair')
      }

      return { from: linkedExpense, to: income }
    })
  }

  async update(id: string, data: UpdateTransactionData): Promise<TransactionRecord | null> {
    const { categoryIds, ...transactionData } = data

    return db.transaction(async tx => {
      const [updated] = await tx
        .update(transactions)
        .set({
          ...transactionData,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, id))
        .returning()

      if (!updated) {
        return null
      }

      if (categoryIds !== undefined) {
        await tx
          .delete(transactionCategories)
          .where(eq(transactionCategories.transactionId, id))

        if (categoryIds.length > 0) {
          await tx.insert(transactionCategories).values(
            categoryIds.map(categoryId => ({
              transactionId: id,
              categoryId,
            }))
          )
        }
      }

      return updated
    })
  }

  async delete(id: string): Promise<TransactionRecord | null> {
    const [deleted] = await db.delete(transactions).where(eq(transactions.id, id)).returning()
    return deleted ?? null
  }

  async deleteWithTransferPair(id: string, pairId: string | null): Promise<void> {
    await db.transaction(async tx => {
      const ids = pairId ? [id, pairId] : [id]

      if (pairId) {
        await tx
          .update(transactions)
          .set({ transferPairId: null, updatedAt: new Date() })
          .where(inArray(transactions.id, ids))
      }

      for (const deleteId of ids) {
        await tx.delete(transactions).where(eq(transactions.id, deleteId))
      }
    })
  }

  async setCategories(transactionId: string, categoryIds: string[]): Promise<void> {
    await db.transaction(async tx => {
      await tx
        .delete(transactionCategories)
        .where(eq(transactionCategories.transactionId, transactionId))

      if (categoryIds.length > 0) {
        await tx.insert(transactionCategories).values(
          categoryIds.map(categoryId => ({
            transactionId,
            categoryId,
          }))
        )
      }
    })
  }

  async getCategoryIds(transactionIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()

    if (transactionIds.length === 0) {
      return map
    }

    const rows = await db
      .select({
        transactionId: transactionCategories.transactionId,
        categoryId: transactionCategories.categoryId,
      })
      .from(transactionCategories)
      .where(inArray(transactionCategories.transactionId, transactionIds))

    for (const row of rows) {
      const existing = map.get(row.transactionId) ?? []
      existing.push(row.categoryId)
      map.set(row.transactionId, existing)
    }

    return map
  }

  async updateMany(
    organizationId: string,
    updates: Array<{ id: string; data: UpdateTransactionData }>
  ): Promise<TransactionRecord[]> {
    if (updates.length === 0) return []

    return db.transaction(async tx => {
      const updatedRows: TransactionRecord[] = []

      for (const { id, data } of updates) {
        const [existing] = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(eq(transactions.id, id), eq(transactions.organizationId, organizationId)))
          .limit(1)

        if (!existing) continue

        const { categoryIds, ...transactionData } = data

        const [updated] = await tx
          .update(transactions)
          .set({
            ...transactionData,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, id))
          .returning()

        if (!updated) continue

        if (categoryIds !== undefined) {
          await tx
            .delete(transactionCategories)
            .where(eq(transactionCategories.transactionId, id))

          if (categoryIds.length > 0) {
            await tx.insert(transactionCategories).values(
              categoryIds.map(categoryId => ({
                transactionId: id,
                categoryId,
              }))
            )
          }
        }

        updatedRows.push(updated)
      }

      return updatedRows
    })
  }

  async findManualInstallmentRows(
    organizationId: string,
    accountId: string
  ): Promise<TransactionRecord[]> {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.accountId, accountId),
          eq(transactions.type, 'expense'),
          eq(transactions.source, 'manual'),
          gt(transactions.installmentsTotal, 1)
        )
      )
  }

  async findByRecurringId(
    organizationId: string,
    recurringId: string
  ): Promise<TransactionRecord[]> {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.recurringTransactionId, recurringId)
        )
      )
      .orderBy(asc(transactions.date))
  }

  async updatePendingFromDate(
    organizationId: string,
    recurringId: string,
    effectiveFrom: Date,
    data: {
      amount?: bigint
      title?: string
      accountId?: string | null
      counterparty?: string | null
      categoryId?: string | null
    }
  ): Promise<number> {
    const transactionPatch: UpdateTransactionData = {}

    if (data.amount !== undefined) transactionPatch.amount = data.amount
    if (data.title !== undefined) transactionPatch.title = data.title
    if (data.accountId !== undefined) transactionPatch.accountId = data.accountId
    if (data.counterparty !== undefined) transactionPatch.counterparty = data.counterparty

    const { categoryId } = data

    return db.transaction(async tx => {
      const rows = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.organizationId, organizationId),
            eq(transactions.recurringTransactionId, recurringId),
            eq(transactions.status, 'pending'),
            gte(transactions.date, effectiveFrom)
          )
        )

      if (rows.length === 0) {
        return 0
      }

      const ids = rows.map(row => row.id)

      if (Object.keys(transactionPatch).length > 0) {
        await tx
          .update(transactions)
          .set({ ...transactionPatch, updatedAt: new Date() })
          .where(inArray(transactions.id, ids))
      }

      if (categoryId !== undefined) {
        for (const id of ids) {
          await tx
            .delete(transactionCategories)
            .where(eq(transactionCategories.transactionId, id))

          if (categoryId) {
            await tx.insert(transactionCategories).values({
              transactionId: id,
              categoryId,
            })
          }
        }
      }

      return rows.length
    })
  }
}
