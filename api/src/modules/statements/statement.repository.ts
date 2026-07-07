import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { db } from '@/db'
import { statements, type StatementImportSource } from '@/db/schemas/statements'
import { transactionCategories } from '@/db/schemas/transactionCategories'
import { transactions, type TransactionType } from '@/db/schemas/transactions'
import {
  isCrossInvoiceBillPayment,
  isWithinPreviousInvoicePaymentWindow,
  shouldMarkInvoicePaid,
  sumBillPaymentsInWindow,
  sumInvoiceSettlementInPeriod,
} from './cross-invoice-payment'
import { shouldMarkImportedIncomePaid } from './invoice-status'

export type StatementRecord = typeof statements.$inferSelect

export type CreateStatementData = {
  accountId: string
  organizationId: string
  periodStart: Date
  periodEnd: Date
  closingDate: Date
  dueDate: Date
  totalAmount: bigint
  minimumPayment?: bigint | null
  previousBalance?: bigint | null
  paymentsReceived?: bigint | null
  purchasesTotal?: bigint | null
  otherCharges?: bigint | null
  nextInvoiceBalance?: bigint | null
  totalOpenBalance?: bigint | null
  fileHash: string
  fileName: string
  importSource?: StatementImportSource | null
  isClosed?: boolean
  isPaid?: boolean
  importedBy?: string | null
}

export type ImportStatementPaymentOptions = {
  isClosed: boolean
  isPaid: boolean
  createSyntheticPayment?: boolean
  paymentSourceAccountId?: string | null
  paymentDate?: Date | null
  paymentTitle?: string
}

export type ImportTransactionData = {
  title: string
  amount: bigint
  type: TransactionType
  date: Date
  competenceDate?: Date | null
  cardId?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  externalId?: string | null
  categoryIds?: string[]
  counterparty?: string | null
}

export type MergeStatementData = {
  periodStart?: Date
  periodEnd: Date
  closingDate?: Date
  dueDate?: Date
  totalAmount: bigint
  minimumPayment?: bigint | null
  previousBalance?: bigint | null
  paymentsReceived?: bigint | null
  purchasesTotal?: bigint | null
  otherCharges?: bigint | null
  nextInvoiceBalance?: bigint | null
  totalOpenBalance?: bigint | null
  fileHash: string
  fileName: string
  importSource?: StatementImportSource | null
  isClosed?: boolean
  isPaid?: boolean
}

export type ImportStatementContext = {
  previousStatement?: StatementRecord | null
  reconcileCrossInvoice?: boolean
}

export interface StatementRepository {
  findByAccountId(organizationId: string, accountId: string): Promise<StatementRecord[]>
  findById(organizationId: string, accountId: string, id: string): Promise<StatementRecord | null>
  findByFileHash(accountId: string, fileHash: string): Promise<StatementRecord | null>
  findOpenByDueDate(accountId: string, dueDate: Date): Promise<StatementRecord | null>
  findClosedByDueDate(accountId: string, dueDate: Date): Promise<StatementRecord | null>
  findByDueDate(accountId: string, dueDate: Date): Promise<StatementRecord | null>
  findPreviousStatementByPeriodEnd(
    accountId: string,
    periodEnd: Date
  ): Promise<StatementRecord | null>
  findExistingExternalIds(accountId: string, externalIds: string[]): Promise<Set<string>>
  findPotentialDuplicates(
    accountId: string,
    items: Array<{ amount: bigint; date: Date }>
  ): Promise<
    Array<{
      id: string
      title: string
      amount: bigint | null
      date: Date
      externalId: string | null
    }>
  >
  importStatement(
    data: CreateStatementData,
    transactionsData: ImportTransactionData[],
    paymentOptions?: ImportStatementPaymentOptions,
    context?: ImportStatementContext
  ): Promise<{ statement: StatementRecord; created: number; skipped: number; transactionIds: string[] }>
  mergeIntoStatement(
    statementId: string,
    data: MergeStatementData,
    transactionsData: ImportTransactionData[],
    paymentOptions?: ImportStatementPaymentOptions,
    context?: ImportStatementContext
  ): Promise<{ statement: StatementRecord; created: number; skipped: number; transactionIds: string[] }>
  reconcileCrossInvoicePayments(accountId: string): Promise<number>
}

export class DrizzleStatementRepository implements StatementRepository {
  async findByAccountId(organizationId: string, accountId: string): Promise<StatementRecord[]> {
    return db
      .select()
      .from(statements)
      .where(
        and(eq(statements.organizationId, organizationId), eq(statements.accountId, accountId))
      )
      .orderBy(desc(statements.importedAt))
  }

  async findById(
    organizationId: string,
    accountId: string,
    id: string
  ): Promise<StatementRecord | null> {
    const [statement] = await db
      .select()
      .from(statements)
      .where(
        and(
          eq(statements.id, id),
          eq(statements.organizationId, organizationId),
          eq(statements.accountId, accountId)
        )
      )
      .limit(1)

    return statement ?? null
  }

  async findByFileHash(accountId: string, fileHash: string): Promise<StatementRecord | null> {
    const [statement] = await db
      .select()
      .from(statements)
      .where(and(eq(statements.accountId, accountId), eq(statements.fileHash, fileHash)))
      .limit(1)

    return statement ?? null
  }

  async findOpenByDueDate(accountId: string, dueDate: Date): Promise<StatementRecord | null> {
    const rows = await db
      .select()
      .from(statements)
      .where(and(eq(statements.accountId, accountId), eq(statements.isClosed, false)))
      .orderBy(desc(statements.importedAt))

    const dueDay = dueDate.toISOString().slice(0, 10)

    return (
      rows.find(row => row.dueDate?.toISOString().slice(0, 10) === dueDay) ?? null
    )
  }

  async findClosedByDueDate(accountId: string, dueDate: Date): Promise<StatementRecord | null> {
    const rows = await db
      .select()
      .from(statements)
      .where(and(eq(statements.accountId, accountId), eq(statements.isClosed, true)))
      .orderBy(desc(statements.importedAt))

    const dueDay = dueDate.toISOString().slice(0, 10)

    return (
      rows.find(row => row.dueDate?.toISOString().slice(0, 10) === dueDay) ?? null
    )
  }

  async findByDueDate(accountId: string, dueDate: Date): Promise<StatementRecord | null> {
    const rows = await db
      .select()
      .from(statements)
      .where(eq(statements.accountId, accountId))
      .orderBy(desc(statements.importedAt))

    const dueDay = dueDate.toISOString().slice(0, 10)

    return (
      rows.find(row => row.dueDate?.toISOString().slice(0, 10) === dueDay) ?? null
    )
  }

  async findPreviousStatementByPeriodEnd(
    accountId: string,
    periodEnd: Date
  ): Promise<StatementRecord | null> {
    const rows = await db
      .select()
      .from(statements)
      .where(and(eq(statements.accountId, accountId), eq(statements.isClosed, true)))
      .orderBy(desc(statements.dueDate))

    const targetDay = periodEnd.toISOString().slice(0, 10)

    return (
      rows.find(row => row.periodEnd?.toISOString().slice(0, 10) === targetDay) ?? null
    )
  }

  async reconcileCrossInvoicePayments(accountId: string): Promise<number> {
    const rows = await db
      .select()
      .from(statements)
      .where(and(eq(statements.accountId, accountId), eq(statements.importSource, 'ofx')))
      .orderBy(statements.dueDate)

    let moved = 0

    for (const current of rows) {
      if (!current.periodStart || !current.periodEnd) continue

      const previous = await this.findPreviousStatementByPeriodEnd(
        accountId,
        current.periodStart
      )

      if (!previous?.periodEnd || !previous.dueDate) continue

      const paymentRows = await db
        .select({
          id: transactions.id,
          title: transactions.title,
          type: transactions.type,
          date: transactions.date,
          amount: transactions.amount,
          statementId: transactions.statementId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, accountId),
            eq(transactions.statementId, current.id),
            eq(transactions.type, 'income')
          )
        )

      for (const row of paymentRows) {
        if (
          !isCrossInvoiceBillPayment(
            {
              type: row.type as 'income' | 'expense',
              title: row.title,
              date: row.date,
            },
            {
              periodEnd: previous.periodEnd,
              dueDate: previous.dueDate,
            },
            {
              periodStart: current.periodStart,
              periodEnd: current.periodEnd,
            }
          )
        ) {
          continue
        }

        await db
          .update(transactions)
          .set({
            statementId: previous.id,
            status: 'paid',
            paidAt: row.date,
            paidAmount: row.amount,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, row.id))

        moved += 1
      }

      await this.reconcileStatementPaidStatus(previous.id)
    }

    const closedStatements = await db
      .select({ id: statements.id })
      .from(statements)
      .where(and(eq(statements.accountId, accountId), eq(statements.isClosed, true)))

    for (const statement of closedStatements) {
      await this.reconcileStatementPaidStatus(statement.id)
    }

    const accountStatements = await db
      .select({ id: statements.id })
      .from(statements)
      .where(eq(statements.accountId, accountId))

    for (const statement of accountStatements) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(eq(transactions.statementId, statement.id))

      await db
        .update(statements)
        .set({ transactionsCount: count })
        .where(eq(statements.id, statement.id))
    }

    return moved
  }

  private async reconcileStatementPaidStatus(statementId: string): Promise<void> {
    const [statement] = await db
      .select()
      .from(statements)
      .where(eq(statements.id, statementId))
      .limit(1)

    if (
      !statement?.isClosed ||
      !statement.periodStart ||
      !statement.periodEnd ||
      !statement.dueDate ||
      !statement.totalAmount
    ) {
      return
    }

    const incomeRows = await db
      .select({
        type: transactions.type,
        title: transactions.title,
        date: transactions.date,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(and(eq(transactions.statementId, statementId), eq(transactions.type, 'income')))

    const mappedIncome = incomeRows.map(row => ({
      type: row.type as 'income' | 'expense',
      title: row.title,
      amount: row.amount ?? 0n,
      date: row.date,
    }))

    const billPaymentsTotal = sumBillPaymentsInWindow(
      mappedIncome,
      statement.periodEnd,
      statement.dueDate
    )

    const settlementTotal = sumInvoiceSettlementInPeriod(
      mappedIncome,
      statement.periodStart,
      statement.periodEnd,
      statement.dueDate
    )

    const isPaid = shouldMarkInvoicePaid(statement.totalAmount, settlementTotal)

    await db
      .update(statements)
      .set({
        isPaid,
        paymentsReceived:
          billPaymentsTotal > 0n ? billPaymentsTotal : statement.paymentsReceived,
      })
      .where(eq(statements.id, statementId))
  }

  private resolveImportStatementId(
    item: ImportTransactionData,
    currentStatement: Pick<StatementRecord, 'id' | 'periodStart' | 'periodEnd'>,
    previousStatement: StatementRecord | null | undefined
  ): string {
    if (
      !previousStatement?.periodEnd ||
      !previousStatement.dueDate ||
      !currentStatement.periodStart ||
      !currentStatement.periodEnd
    ) {
      return currentStatement.id
    }

    if (
      isCrossInvoiceBillPayment(
        { type: item.type as 'income' | 'expense', title: item.title, date: item.date },
        {
          periodEnd: previousStatement.periodEnd,
          dueDate: previousStatement.dueDate,
        },
        {
          periodStart: currentStatement.periodStart,
          periodEnd: currentStatement.periodEnd,
        }
      )
    ) {
      return previousStatement.id
    }

    return currentStatement.id
  }

  async findExistingExternalIds(accountId: string, externalIds: string[]): Promise<Set<string>> {
    if (externalIds.length === 0) return new Set()

    const rows = await db
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(
        and(eq(transactions.accountId, accountId), inArray(transactions.externalId, externalIds))
      )

    return new Set(rows.map(row => row.externalId).filter((id): id is string => !!id))
  }

  async findPotentialDuplicates(
    accountId: string,
    items: Array<{ amount: bigint; date: Date }>
  ) {
    if (items.length === 0) return []

    const minDate = new Date(Math.min(...items.map(item => item.date.getTime())))
    const maxDate = new Date(Math.max(...items.map(item => item.date.getTime())))
    minDate.setDate(minDate.getDate() - 2)
    maxDate.setDate(maxDate.getDate() + 2)

    const amounts = [...new Set(items.map(item => item.amount))]

    return db
      .select({
        id: transactions.id,
        title: transactions.title,
        amount: transactions.amount,
        date: transactions.date,
        externalId: transactions.externalId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, minDate),
          lte(transactions.date, maxDate),
          inArray(transactions.amount, amounts)
        )
      )
  }

  async mergeIntoStatement(
    statementId: string,
    data: MergeStatementData,
    transactionsData: ImportTransactionData[],
    paymentOptions?: ImportStatementPaymentOptions,
    context?: ImportStatementContext
  ): Promise<{ statement: StatementRecord; created: number; skipped: number; transactionIds: string[] }> {
    const [existingStatement] = await db
      .select()
      .from(statements)
      .where(eq(statements.id, statementId))
      .limit(1)

    if (!existingStatement) {
      throw new Error('Statement not found')
    }

    const markPaymentsAsPaid =
      paymentOptions?.isClosed === true && paymentOptions?.isPaid === true

    return db.transaction(async tx => {
      const externalIds = transactionsData
        .map(item => item.externalId)
        .filter((id): id is string => !!id)

      const existingExternalIds = new Set<string>()

      if (externalIds.length > 0) {
        const rows = await tx
          .select({ externalId: transactions.externalId })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, existingStatement.accountId),
              inArray(transactions.externalId, externalIds)
            )
          )

        for (const row of rows) {
          if (row.externalId) {
            existingExternalIds.add(row.externalId)
          }
        }
      }

      const periodEnd = data.periodEnd
      const dueDate = data.dueDate ?? existingStatement.dueDate ?? data.periodEnd
      const closingDate = data.closingDate ?? existingStatement.closingDate ?? data.periodEnd
      const previousStatement = context?.previousStatement ?? null
      const currentStatement = {
        id: existingStatement.id,
        periodStart: data.periodStart ?? existingStatement.periodStart,
        periodEnd: data.periodEnd,
      }

      let created = 0
      let skipped = 0
      const transactionIds: string[] = []

      for (const item of transactionsData) {
        if (item.externalId && existingExternalIds.has(item.externalId)) {
          skipped += 1
          continue
        }

        const targetStatementId = context?.reconcileCrossInvoice
          ? this.resolveImportStatementId(item, currentStatement, previousStatement)
          : existingStatement.id

        const targetPeriodEnd =
          targetStatementId === previousStatement?.id && previousStatement?.periodEnd
            ? previousStatement.periodEnd
            : periodEnd
        const targetDueDate =
          targetStatementId === previousStatement?.id && previousStatement?.dueDate
            ? previousStatement.dueDate
            : dueDate

        const inPaymentWindow =
          item.type === 'income' &&
          isWithinPreviousInvoicePaymentWindow(item.date, targetPeriodEnd, targetDueDate)

        const shouldMarkPaid = shouldMarkImportedIncomePaid({
          type: item.type as 'income' | 'expense',
          isClosed: paymentOptions?.isClosed === true,
          markPaymentsAsPaid,
          inPaymentWindow,
        })

        const [createdTx] = await tx
          .insert(transactions)
          .values({
            organizationId: existingStatement.organizationId,
            accountId: existingStatement.accountId,
            cardId: item.cardId ?? null,
            statementId: targetStatementId,
            title: item.title,
            amount: item.amount,
            type: item.type,
            date: item.date,
            competenceDate: item.competenceDate ?? null,
            status: shouldMarkPaid ? 'paid' : 'pending',
            paidAt: shouldMarkPaid ? item.date : null,
            paidAmount: shouldMarkPaid ? item.amount : null,
            counterparty: item.counterparty ?? null,
            installmentNumber: item.installmentNumber ?? null,
            installmentsTotal: item.installmentsTotal ?? null,
            source: 'import',
            externalId: item.externalId ?? null,
          })
          .returning()

        if (item.categoryIds?.length) {
          await tx.insert(transactionCategories).values(
            item.categoryIds.map(categoryId => ({
              transactionId: createdTx.id,
              categoryId,
            }))
          )
        }

        if (item.externalId) {
          existingExternalIds.add(item.externalId)
        }

        transactionIds.push(createdTx.id)
        created += 1
      }

      if (markPaymentsAsPaid) {
        const incomeRows = await tx
          .select({ id: transactions.id, amount: transactions.amount, date: transactions.date })
          .from(transactions)
          .where(
            and(
              eq(transactions.statementId, existingStatement.id),
              eq(transactions.type, 'income')
            )
          )

        let paymentsInWindow = 0n
        const pendingInWindow: string[] = []

        for (const row of incomeRows) {
          if (!row.amount) continue
          if (!isWithinPreviousInvoicePaymentWindow(row.date, periodEnd, dueDate)) continue

          paymentsInWindow += row.amount

          if (markPaymentsAsPaid) {
            pendingInWindow.push(row.id)
          }
        }

        if (pendingInWindow.length > 0) {
          for (const row of incomeRows) {
            if (!pendingInWindow.includes(row.id) || !row.amount) continue

            await tx
              .update(transactions)
              .set({
                status: 'paid',
                paidAt: dueDate,
                paidAmount: row.amount,
              })
              .where(eq(transactions.id, row.id))
          }
        }

        if (
          paymentOptions?.createSyntheticPayment !== false &&
          paymentOptions?.paymentSourceAccountId
        ) {
          const remaining = data.totalAmount - paymentsInWindow

          if (remaining > 0n) {
            const paymentDate = paymentOptions.paymentDate ?? dueDate
            const paymentTitle =
              paymentOptions.paymentTitle ?? `Pagamento de fatura importada`

            const [expense] = await tx
              .insert(transactions)
              .values({
                organizationId: existingStatement.organizationId,
                accountId: paymentOptions.paymentSourceAccountId,
                statementId: existingStatement.id,
                title: paymentTitle,
                amount: remaining,
                type: 'expense',
                date: paymentDate,
                status: 'paid',
                paidAt: paymentDate,
                paidAmount: remaining,
                source: 'import',
              })
              .returning()

            const [income] = await tx
              .insert(transactions)
              .values({
                organizationId: existingStatement.organizationId,
                accountId: existingStatement.accountId,
                statementId: existingStatement.id,
                title: paymentTitle,
                amount: remaining,
                type: 'income',
                date: paymentDate,
                status: 'paid',
                paidAt: paymentDate,
                paidAmount: remaining,
                transferPairId: expense.id,
                source: 'import',
              })
              .returning()

            await tx
              .update(transactions)
              .set({ transferPairId: income.id })
              .where(eq(transactions.id, expense.id))

            transactionIds.push(income.id)
            created += 2
          }
        }
      }

      const [updatedStatement] = await tx
        .update(statements)
        .set({
          periodStart: data.periodStart ?? existingStatement.periodStart,
          periodEnd: data.periodEnd,
          closingDate,
          dueDate,
          totalAmount: data.totalAmount,
          minimumPayment: data.minimumPayment ?? existingStatement.minimumPayment,
          previousBalance: data.previousBalance ?? existingStatement.previousBalance,
          paymentsReceived: data.paymentsReceived ?? existingStatement.paymentsReceived,
          purchasesTotal: data.purchasesTotal ?? existingStatement.purchasesTotal,
          otherCharges: data.otherCharges ?? existingStatement.otherCharges,
          nextInvoiceBalance: data.nextInvoiceBalance ?? existingStatement.nextInvoiceBalance,
          totalOpenBalance: data.totalOpenBalance ?? existingStatement.totalOpenBalance,
          fileHash: data.fileHash,
          fileName: data.fileName,
          importSource: data.importSource ?? existingStatement.importSource,
          isClosed: data.isClosed ?? existingStatement.isClosed,
          isPaid: data.isPaid ?? existingStatement.isPaid,
          transactionsCount: existingStatement.transactionsCount + created,
        })
        .where(eq(statements.id, statementId))
        .returning()

      return {
        statement: updatedStatement,
        created,
        skipped,
        transactionIds,
      }
    })
  }

  async importStatement(
    data: CreateStatementData,
    transactionsData: ImportTransactionData[],
    paymentOptions?: ImportStatementPaymentOptions,
    context?: ImportStatementContext
  ): Promise<{ statement: StatementRecord; created: number; skipped: number; transactionIds: string[] }> {
    const externalIds = transactionsData
      .map(item => item.externalId)
      .filter((id): id is string => !!id)

    const markPaymentsAsPaid =
      paymentOptions?.isClosed === true && paymentOptions?.isPaid === true

    return db.transaction(async tx => {
      const existingExternalIds = new Set<string>()

      if (externalIds.length > 0) {
        const rows = await tx
          .select({ externalId: transactions.externalId })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, data.accountId),
              inArray(transactions.externalId, externalIds)
            )
          )

        for (const row of rows) {
          if (row.externalId) {
            existingExternalIds.add(row.externalId)
          }
        }
      }

      const [statement] = await tx
        .insert(statements)
        .values({
          accountId: data.accountId,
          organizationId: data.organizationId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          closingDate: data.closingDate,
          dueDate: data.dueDate,
          totalAmount: data.totalAmount,
          minimumPayment: data.minimumPayment ?? null,
          previousBalance: data.previousBalance ?? null,
          paymentsReceived: data.paymentsReceived ?? null,
          purchasesTotal: data.purchasesTotal ?? null,
          otherCharges: data.otherCharges ?? null,
          nextInvoiceBalance: data.nextInvoiceBalance ?? null,
          totalOpenBalance: data.totalOpenBalance ?? null,
          fileHash: data.fileHash,
          fileName: data.fileName,
          importSource: data.importSource ?? null,
          isClosed: data.isClosed ?? false,
          isPaid: data.isPaid ?? false,
          importedBy: data.importedBy ?? null,
          transactionsCount: 0,
        })
        .returning()

      let created = 0
      let skipped = 0
      const transactionIds: string[] = []
      let paymentsInWindow = 0n
      const previousStatement = context?.previousStatement ?? null
      const currentStatement = {
        id: statement.id,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      }

      for (const item of transactionsData) {
        if (item.externalId && existingExternalIds.has(item.externalId)) {
          skipped += 1
          continue
        }

        const targetStatementId = context?.reconcileCrossInvoice
          ? this.resolveImportStatementId(item, currentStatement, previousStatement)
          : statement.id

        const targetPeriodEnd =
          targetStatementId === previousStatement?.id && previousStatement?.periodEnd
            ? previousStatement.periodEnd
            : data.periodEnd
        const targetDueDate =
          targetStatementId === previousStatement?.id && previousStatement?.dueDate
            ? previousStatement.dueDate
            : data.dueDate

        const inPaymentWindow =
          item.type === 'income' &&
          isWithinPreviousInvoicePaymentWindow(item.date, targetPeriodEnd, targetDueDate)

        const shouldMarkPaid = shouldMarkImportedIncomePaid({
          type: item.type as 'income' | 'expense',
          isClosed: data.isClosed === true,
          markPaymentsAsPaid,
          inPaymentWindow,
        })

        if (shouldMarkPaid && targetStatementId === statement.id) {
          paymentsInWindow += item.amount
        }

        const [createdTx] = await tx
          .insert(transactions)
          .values({
            organizationId: data.organizationId,
            accountId: data.accountId,
            cardId: item.cardId ?? null,
            statementId: targetStatementId,
            title: item.title,
            amount: item.amount,
            type: item.type,
            date: item.date,
            competenceDate: item.competenceDate ?? null,
            status: shouldMarkPaid ? 'paid' : 'pending',
            paidAt: shouldMarkPaid ? item.date : null,
            paidAmount: shouldMarkPaid ? item.amount : null,
            counterparty: item.counterparty ?? null,
            installmentNumber: item.installmentNumber ?? null,
            installmentsTotal: item.installmentsTotal ?? null,
            source: 'import',
            externalId: item.externalId ?? null,
          })
          .returning()

        if (item.categoryIds?.length) {
          await tx.insert(transactionCategories).values(
            item.categoryIds.map(categoryId => ({
              transactionId: createdTx.id,
              categoryId,
            }))
          )
        }

        if (item.externalId) {
          existingExternalIds.add(item.externalId)
        }

        transactionIds.push(createdTx.id)
        created += 1
      }

      if (
        markPaymentsAsPaid &&
        paymentOptions?.createSyntheticPayment !== false &&
        paymentOptions.paymentSourceAccountId
      ) {
        const remaining = data.totalAmount - paymentsInWindow

        if (remaining > 0n) {
          const paymentDate = paymentOptions.paymentDate ?? data.dueDate
          const paymentTitle =
            paymentOptions.paymentTitle ?? `Pagamento de fatura importada`

          const [expense] = await tx
            .insert(transactions)
            .values({
              organizationId: data.organizationId,
              accountId: paymentOptions.paymentSourceAccountId,
              statementId: statement.id,
              title: paymentTitle,
              amount: remaining,
              type: 'expense',
              date: paymentDate,
              status: 'paid',
              paidAt: paymentDate,
              paidAmount: remaining,
              source: 'import',
            })
            .returning()

          const [income] = await tx
            .insert(transactions)
            .values({
              organizationId: data.organizationId,
              accountId: data.accountId,
              statementId: statement.id,
              title: paymentTitle,
              amount: remaining,
              type: 'income',
              date: paymentDate,
              status: 'paid',
              paidAt: paymentDate,
              paidAmount: remaining,
              transferPairId: expense.id,
              source: 'import',
            })
            .returning()

          await tx
            .update(transactions)
            .set({ transferPairId: income.id })
            .where(eq(transactions.id, expense.id))

          transactionIds.push(income.id)
          created += 2
        }
      }

      const [updatedStatement] = await tx
        .update(statements)
        .set({ transactionsCount: created })
        .where(eq(statements.id, statement.id))
        .returning()

      return {
        statement: updatedStatement,
        created,
        skipped,
        transactionIds,
      }
    })
  }
}
