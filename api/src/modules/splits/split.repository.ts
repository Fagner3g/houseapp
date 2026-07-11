import { and, desc, eq, inArray, sql, sum } from 'drizzle-orm'

import { db } from '@/db'
import { splitPayments, type SplitPaymentMethod } from '@/db/schemas/splitPayments'
import {
  transactionSplits,
  type SplitStatus,
} from '@/db/schemas/transactionSplits'
import { accounts } from '@/db/schemas/accounts'
import { cards } from '@/db/schemas/cards'
import { transactions } from '@/db/schemas/transactions'
import type { TransactionType } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'
import {
  userIsSplitCreditorCondition,
} from '@/modules/splits/split-expense-attribution'

export type SplitRecord = typeof transactionSplits.$inferSelect
export type SplitPaymentRecord = typeof splitPayments.$inferSelect

export type CreateSplitData = {
  transactionId: string
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  amount: bigint
  description?: string | null
  notifyEnabled?: boolean
  collectLumpSum?: boolean
}

export type UpdateSplitData = Partial<
  Omit<CreateSplitData, 'transactionId' | 'amount'> & {
    amount: bigint
    status: SplitStatus
    notifyEnabled: boolean
    collectLumpSum: boolean
    isNotified: boolean
    lastNotifiedAt: Date | null
  }
>

export type CreateSplitPaymentData = {
  splitId: string
  amount: bigint
  paidAt?: Date
  method?: SplitPaymentMethod | null
  note?: string | null
}

export type PendingSplitRow = SplitRecord & {
  transactionTitle: string
  transactionDate: Date
  transactionAmount: bigint | null
  personName: string | null
}

export interface SplitRepository {
  findByTransaction(transactionId: string): Promise<SplitRecord[]>
  findById(transactionId: string, id: string): Promise<SplitRecord | null>
  create(data: CreateSplitData): Promise<SplitRecord>
  update(id: string, data: UpdateSplitData): Promise<SplitRecord | null>
  delete(id: string): Promise<SplitRecord | null>
  findPayments(splitId: string): Promise<SplitPaymentRecord[]>
  findPayment(splitId: string, paymentId: string): Promise<SplitPaymentRecord | null>
  createPayment(data: CreateSplitPaymentData): Promise<{
    payment: SplitPaymentRecord
    split: SplitRecord
  }>
  deletePayment(splitId: string, paymentId: string): Promise<SplitRecord | null>
  listPendingByOrganization(organizationId: string, userId: string): Promise<PendingSplitRow[]>
  listActivePendingSplits(organizationId: string): Promise<PendingSplitNotifyRow[]>
  listNotifyEnabledPending(organizationId: string): Promise<PendingSplitNotifyRow[]>
  listTransactionIdsWithSplits(
    organizationId: string,
    transactionIds: string[]
  ): Promise<string[]>
  listFullyDelegatedTransactions(
    organizationId: string,
    transactionIds: string[]
  ): Promise<Array<{ transactionId: string; delegateName: string }>>
  listPartiallyDividedTransactions(
    organizationId: string,
    transactionIds: string[]
  ): Promise<
    Array<{
      transactionId: string
      splitWithName: string
      splitAmount: bigint
      transactionAmount: bigint
    }>
  >
  listSplitPaidTotals(
    organizationId: string,
    transactionIds: string[]
  ): Promise<Array<{ transactionId: string; paidTotal: bigint }>>
  listSplitRemainingTotals(
    organizationId: string,
    transactionIds: string[]
  ): Promise<Array<{ transactionId: string; remainingTotal: bigint }>>
  findSplitsWithTransactions(
    transactionIds: string[]
  ): Promise<
    Array<
      SplitRecord & {
        installmentNumber: number | null
        transactionAmount: bigint | null
        userName: string | null
      }
    >
  >
  findInstallmentSiblingCandidates(
    organizationId: string,
    anchor: Pick<
      TransactionRecord,
      'installmentsTotal' | 'accountId' | 'cardId'
    >
  ): Promise<TransactionRecord[]>
}

export type PendingSplitNotifyRow = PendingSplitRow & {
  transactionStatus: string
  organizationId: string
  competenceDate: Date | null
  transactionType: TransactionType
  installmentNumber: number | null
  accountType: string | null
  closingDay: number | null
  dueDay: number | null
}

function computeSplitStatus(amount: bigint, paidAmount: bigint, currentStatus: SplitStatus): SplitStatus {
  if (currentStatus === 'forgiven') return 'forgiven'
  if (paidAmount <= 0n) return 'pending'
  if (paidAmount >= amount) return 'paid'
  return 'partial'
}

function resolveSplitPaidAt(
  status: SplitStatus,
  payments: SplitPaymentRecord[]
): Date | null {
  if (status === 'pending' || payments.length === 0) return null

  const [firstPayment] = payments
  if (!firstPayment) return null

  return payments.reduce(
    (latest, payment) => (payment.paidAt > latest ? payment.paidAt : latest),
    firstPayment.paidAt
  )
}

async function syncSplitFromPayments(
  tx: Pick<typeof db, 'select' | 'update'>,
  splitId: string,
  options?: { paidAtOnFull?: Date }
): Promise<SplitRecord> {
  const [sumRow] = await tx
    .select({ total: sum(splitPayments.amount) })
    .from(splitPayments)
    .where(eq(splitPayments.splitId, splitId))

  const paidAmount = BigInt(sumRow?.total ?? 0)

  const [currentSplit] = await tx
    .select()
    .from(transactionSplits)
    .where(eq(transactionSplits.id, splitId))
    .limit(1)

  if (!currentSplit) {
    throw new Error('Split not found while syncing payments')
  }

  const payments = await tx
    .select()
    .from(splitPayments)
    .where(eq(splitPayments.splitId, splitId))
    .orderBy(desc(splitPayments.paidAt))

  const status = computeSplitStatus(currentSplit.amount, paidAmount, currentSplit.status)
  const paidAt =
    status === 'paid' && options?.paidAtOnFull
      ? options.paidAtOnFull
      : resolveSplitPaidAt(status, payments)

  const [split] = await tx
    .update(transactionSplits)
    .set({
      paidAmount,
      status,
      paidAt,
      updatedAt: new Date(),
    })
    .where(eq(transactionSplits.id, splitId))
    .returning()

  return split
}

export class DrizzleSplitRepository implements SplitRepository {
  async findByTransaction(transactionId: string): Promise<SplitRecord[]> {
    return db
      .select()
      .from(transactionSplits)
      .where(eq(transactionSplits.transactionId, transactionId))
      .orderBy(transactionSplits.createdAt)
  }

  async findById(transactionId: string, id: string): Promise<SplitRecord | null> {
    const [split] = await db
      .select()
      .from(transactionSplits)
      .where(
        and(eq(transactionSplits.id, id), eq(transactionSplits.transactionId, transactionId))
      )
      .limit(1)

    return split ?? null
  }

  async create(data: CreateSplitData): Promise<SplitRecord> {
    const [created] = await db
      .insert(transactionSplits)
      .values({
        transactionId: data.transactionId,
        userId: data.userId ?? null,
        contactName: data.contactName ?? null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        amount: data.amount,
        description: data.description ?? null,
        status: 'pending',
        paidAmount: 0n,
        notifyEnabled: data.notifyEnabled ?? true,
        collectLumpSum: data.collectLumpSum ?? false,
      })
      .returning()

    return created
  }

  async update(id: string, data: UpdateSplitData): Promise<SplitRecord | null> {
    const [updated] = await db
      .update(transactionSplits)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(transactionSplits.id, id))
      .returning()

    return updated ?? null
  }

  async delete(id: string): Promise<SplitRecord | null> {
    const [deleted] = await db
      .delete(transactionSplits)
      .where(eq(transactionSplits.id, id))
      .returning()

    return deleted ?? null
  }

  async findPayments(splitId: string): Promise<SplitPaymentRecord[]> {
    return db
      .select()
      .from(splitPayments)
      .where(eq(splitPayments.splitId, splitId))
      .orderBy(splitPayments.paidAt)
  }

  async findPayment(splitId: string, paymentId: string): Promise<SplitPaymentRecord | null> {
    const [payment] = await db
      .select()
      .from(splitPayments)
      .where(and(eq(splitPayments.id, paymentId), eq(splitPayments.splitId, splitId)))
      .limit(1)

    return payment ?? null
  }

  async createPayment(data: CreateSplitPaymentData): Promise<{
    payment: SplitPaymentRecord
    split: SplitRecord
  }> {
    return db.transaction(async tx => {
      const [payment] = await tx
        .insert(splitPayments)
        .values({
          splitId: data.splitId,
          amount: data.amount,
          paidAt: data.paidAt ?? new Date(),
          method: data.method ?? null,
          note: data.note ?? null,
        })
        .returning()

      const split = await syncSplitFromPayments(tx, data.splitId, {
        paidAtOnFull: data.paidAt ?? new Date(),
      })

      return { payment, split }
    })
  }

  async deletePayment(splitId: string, paymentId: string): Promise<SplitRecord | null> {
    return db.transaction(async tx => {
      const [deleted] = await tx
        .delete(splitPayments)
        .where(and(eq(splitPayments.id, paymentId), eq(splitPayments.splitId, splitId)))
        .returning()

      if (!deleted) return null

      return syncSplitFromPayments(tx, splitId)
    })
  }

  async listPendingByOrganization(
    organizationId: string,
    userId: string
  ): Promise<PendingSplitRow[]> {
    const rows = await db
      .select({
        split: transactionSplits,
        transactionTitle: transactions.title,
        transactionDate: transactions.date,
        transactionAmount: transactions.amount,
        userName: users.name,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(cards, eq(transactions.cardId, cards.id))
      .leftJoin(users, eq(transactionSplits.userId, users.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.status, ['pending', 'partial']),
          userIsSplitCreditorCondition(userId)
        )
      )
      .orderBy(transactions.date)

    return rows.map(row => ({
      ...row.split,
      transactionTitle: row.transactionTitle,
      transactionDate: row.transactionDate,
      transactionAmount: row.transactionAmount,
      personName: row.userName ?? row.split.contactName,
    }))
  }

  async listActivePendingSplits(organizationId: string): Promise<PendingSplitNotifyRow[]> {
    const rows = await db
      .select({
        split: transactionSplits,
        transactionTitle: transactions.title,
        transactionDate: transactions.date,
        transactionAmount: transactions.amount,
        transactionStatus: transactions.status,
        organizationId: transactions.organizationId,
        competenceDate: transactions.competenceDate,
        transactionType: transactions.type,
        installmentNumber: transactions.installmentNumber,
        accountType: accounts.type,
        closingDay: accounts.closingDay,
        dueDay: accounts.dueDay,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.status, ['pending', 'partial'])
        )
      )
      .orderBy(transactions.date)

    return rows.map(row => ({
      ...row.split,
      transactionTitle: row.transactionTitle,
      transactionDate: row.transactionDate,
      transactionAmount: row.transactionAmount,
      personName: null,
      transactionStatus: row.transactionStatus,
      organizationId: row.organizationId,
      competenceDate: row.competenceDate,
      transactionType: row.transactionType,
      installmentNumber: row.installmentNumber,
      accountType: row.accountType,
      closingDay: row.closingDay,
      dueDay: row.dueDay,
    }))
  }

  async listNotifyEnabledPending(organizationId: string): Promise<PendingSplitNotifyRow[]> {
    const rows = await this.listActivePendingSplits(organizationId)
    return rows.filter(split => split.notifyEnabled)
  }

  async listTransactionIdsWithSplits(
    organizationId: string,
    transactionIds: string[]
  ): Promise<string[]> {
    if (transactionIds.length === 0) return []

    const rows = await db
      .selectDistinct({ transactionId: transactionSplits.transactionId })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.transactionId, transactionIds)
        )
      )

    return rows.map(row => row.transactionId)
  }

  async listFullyDelegatedTransactions(
    organizationId: string,
    transactionIds: string[]
  ): Promise<Array<{ transactionId: string; delegateName: string }>> {
    if (transactionIds.length === 0) return []

    const rows = await db
      .select({
        transactionId: transactions.id,
        delegateName: sql<string>`(
          array_agg(COALESCE(${users.name}, ${transactionSplits.contactName}) ORDER BY ${transactionSplits.amount} DESC)
        )[1]`,
      })
      .from(transactions)
      .innerJoin(transactionSplits, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(users, eq(transactionSplits.userId, users.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.id, transactionIds)
        )
      )
      .groupBy(transactions.id, transactions.amount)
      .having(sql`SUM(${transactionSplits.amount}) >= ${transactions.amount}`)

    return rows
      .filter(row => row.delegateName)
      .map(row => ({
        transactionId: row.transactionId,
        delegateName: row.delegateName,
      }))
  }

  async listPartiallyDividedTransactions(
    organizationId: string,
    transactionIds: string[]
  ): Promise<
    Array<{
      transactionId: string
      splitWithName: string
      splitAmount: bigint
      transactionAmount: bigint
    }>
  > {
    if (transactionIds.length === 0) return []

    const rows = await db
      .select({
        transactionId: transactions.id,
        transactionAmount: transactions.amount,
        splitAmount: sql<bigint>`SUM(${transactionSplits.amount})`,
        splitWithName: sql<string>`(
          array_agg(COALESCE(${users.name}, ${transactionSplits.contactName}) ORDER BY ${transactionSplits.amount} DESC)
        )[1]`,
      })
      .from(transactions)
      .innerJoin(transactionSplits, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(users, eq(transactionSplits.userId, users.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.id, transactionIds)
        )
      )
      .groupBy(transactions.id, transactions.amount)
      .having(
        sql`SUM(${transactionSplits.amount}) > 0 AND SUM(${transactionSplits.amount}) < ${transactions.amount}`
      )

    return rows
      .filter(row => row.splitWithName)
      .map(row => ({
        transactionId: row.transactionId,
        splitWithName: row.splitWithName,
        splitAmount: BigInt(row.splitAmount),
        transactionAmount: row.transactionAmount ?? 0n,
      }))
  }

  async listSplitPaidTotals(
    organizationId: string,
    transactionIds: string[]
  ): Promise<Array<{ transactionId: string; paidTotal: bigint }>> {
    if (transactionIds.length === 0) return []

    const rows = await db
      .select({
        transactionId: transactionSplits.transactionId,
        paidTotal: sql<bigint>`COALESCE(SUM(${transactionSplits.paidAmount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.transactionId, transactionIds)
        )
      )
      .groupBy(transactionSplits.transactionId)

    return rows.map(row => ({
      transactionId: row.transactionId,
      paidTotal: BigInt(row.paidTotal),
    }))
  }

  async listSplitRemainingTotals(
    organizationId: string,
    transactionIds: string[]
  ): Promise<Array<{ transactionId: string; remainingTotal: bigint }>> {
    if (transactionIds.length === 0) return []

    const rows = await db
      .select({
        transactionId: transactionSplits.transactionId,
        remainingTotal: sql<bigint>`COALESCE(
          SUM(
            GREATEST(
              ${transactionSplits.amount} - COALESCE(${transactionSplits.paidAmount}, 0),
              0
            )
          ),
          0
        )`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactionSplits.transactionId, transactionIds),
          inArray(transactionSplits.status, ['pending', 'partial'])
        )
      )
      .groupBy(transactionSplits.transactionId)

    return rows.map(row => ({
      transactionId: row.transactionId,
      remainingTotal: BigInt(row.remainingTotal),
    }))
  }

  async findSplitsWithTransactions(
    transactionIds: string[]
  ): Promise<
    Array<
      SplitRecord & {
        installmentNumber: number | null
        transactionAmount: bigint | null
        userName: string | null
      }
    >
  > {
    if (transactionIds.length === 0) return []

    const rows = await db
      .select({
        split: transactionSplits,
        installmentNumber: transactions.installmentNumber,
        transactionAmount: transactions.amount,
        userName: users.name,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .leftJoin(users, eq(transactionSplits.userId, users.id))
      .where(inArray(transactionSplits.transactionId, transactionIds))
      .orderBy(transactions.installmentNumber, transactionSplits.createdAt)

    return rows.map(row => ({
      ...row.split,
      installmentNumber: row.installmentNumber,
      transactionAmount: row.transactionAmount,
      userName: row.userName,
    }))
  }

  async findInstallmentSiblingCandidates(
    organizationId: string,
    anchor: Pick<TransactionRecord, 'installmentsTotal' | 'accountId' | 'cardId'>
  ): Promise<TransactionRecord[]> {
    if (anchor.installmentsTotal == null || anchor.installmentsTotal < 2) return []

    const conditions = [
      eq(transactions.organizationId, organizationId),
      eq(transactions.installmentsTotal, anchor.installmentsTotal),
    ]

    if (anchor.accountId) {
      conditions.push(eq(transactions.accountId, anchor.accountId))
    } else {
      conditions.push(sql`${transactions.accountId} IS NULL`)
    }

    if (anchor.cardId) {
      conditions.push(eq(transactions.cardId, anchor.cardId))
    } else {
      conditions.push(sql`${transactions.cardId} IS NULL`)
    }

    return db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(transactions.installmentNumber)
  }
}
