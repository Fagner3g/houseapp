import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { cards } from '@/db/schemas/cards'
import { transactions } from '@/db/schemas/transactions'
import type {
  TransactionSource,
  TransactionStatus,
  TransactionType,
  NotifyTargetType,
  TransactionNotifyOverdueConfig,
} from '@/db/schemas/transactions'
import { badRequest, notFound } from '@/core/errors'
import { centavosToString, parseCentavos } from '@/core/money'
import {
  computeTransactionStatus,
  resolveTransactionPaidAt,
  transactionRemainingAmount,
} from '@/core/transaction-payment'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { SplitService } from '@/modules/splits/split.service'
import type { StatementRepository } from '@/modules/statements/statement.repository'
import { matchesInstallmentSeries } from '@/modules/splits/split-debt-summary.logic'

import type {
  ListTransactionsFilter,
  TransactionRecord,
  TransactionRepository,
} from './transaction.repository'
import {
  assertNotifyUserBelongsToOrg,
  notifyTargetFromRecord,
  resolveNotifyTarget,
  type NotifyTargetInput,
} from './notify-target'
import { buildCreditCardInstallments } from './credit-card-installments.logic'
import {
  assertImportedStatementUpdateAllowed,
  isImportedStatementTransaction,
} from './imported-statement-transaction.logic'
import {
  buildInstallmentSeriesRepairPlan,
  groupManualInstallmentSeries,
  isIncompleteInstallmentSeries,
} from './credit-card-installment-repair.logic'
import { buildPeriodicInstallments } from './periodic-installments.logic'
import { buildPeriodicInstallmentSeriesRepairPlan } from './periodic-installment-repair.logic'
import { normalizeScheduledAt } from './schedule-payment'

export type CreateTransactionResult = {
  transaction: TransactionDto
  installmentsCreated?: number
  transactions?: TransactionDto[]
}

export type TransactionDto = {
  id: string
  organizationId: string
  accountId: string | null
  cardId: string | null
  recurringTransactionId: string | null
  statementId: string | null
  title: string
  description: string | null
  amount: string | null
  type: TransactionType
  date: string
  competenceDate: string | null
  status: TransactionStatus
  paidAt: string | null
  paidAmount: string | null
  paymentScheduledAt: string | null
  counterparty: string | null
  installmentNumber: number | null
  installmentsTotal: number | null
  source: TransactionSource
  categoryIds: string[]
  transferPairId: string | null
  notifyEnabled: boolean
  notifyTargetType: NotifyTargetType | null
  notifyUserId: string | null
  notifyContactName: string | null
  notifyContactPhone: string | null
  notifyDaysBefore: number[] | null
  notifyOverdueConfig: TransactionNotifyOverdueConfig | null
  createdAt: string
  updatedAt: string
}

function toTransactionDto(
  transaction: TransactionRecord,
  categoryIds: string[] = []
): TransactionDto {
  return {
    id: transaction.id,
    organizationId: transaction.organizationId,
    accountId: transaction.accountId,
    cardId: transaction.cardId,
    recurringTransactionId: transaction.recurringTransactionId,
    statementId: transaction.statementId,
    title: transaction.title,
    description: transaction.description,
    amount: centavosToString(transaction.amount),
    type: transaction.type,
    date: transaction.date.toISOString(),
    competenceDate: transaction.competenceDate?.toISOString() ?? null,
    status: transaction.status,
    paidAt: transaction.paidAt?.toISOString() ?? null,
    paidAmount: centavosToString(transaction.paidAmount),
    paymentScheduledAt: transaction.paymentScheduledAt?.toISOString() ?? null,
    counterparty: transaction.counterparty,
    installmentNumber: transaction.installmentNumber,
    installmentsTotal: transaction.installmentsTotal,
    source: transaction.source,
    categoryIds,
    transferPairId: transaction.transferPairId,
    notifyEnabled: transaction.notifyEnabled,
    notifyTargetType: transaction.notifyTargetType,
    notifyUserId: transaction.notifyUserId,
    notifyContactName: transaction.notifyContactName,
    notifyContactPhone: transaction.notifyContactPhone,
    notifyDaysBefore: transaction.notifyDaysBefore ?? undefined,
    notifyOverdueConfig: transaction.notifyOverdueConfig ?? undefined,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  }
}

export type CreateTransactionInput = {
  accountId?: string | null
  cardId?: string | null
  recurringTransactionId?: string | null
  statementId?: string | null
  title: string
  description?: string | null
  amount?: string | null
  type: TransactionType
  date: string
  competenceDate?: string | null
  status?: TransactionStatus
  paidAt?: string | null
  paidAmount?: string | null
  counterparty?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  installmentPeriodicity?: string | null
  source?: TransactionSource
  categoryIds?: string[]
  transferPairId?: string | null
} & NotifyTargetInput

export type UpdateTransactionInput = Partial<CreateTransactionInput>

export type BulkNotifyTargetInput = {
  transactionId: string
} & NotifyTargetInput

export type BulkReviewImportSplitInput = {
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  amount: string
  description?: string | null
}

export type BulkReviewImportInput = {
  transactionId: string
  categoryIds?: string[]
  split?: BulkReviewImportSplitInput
}

export type PayTransactionInput = {
  paidAmount?: string | null
  paidAt?: string | null
  advanceTransactionIds?: string[]
}

export type InstallmentSeriesItem = {
  id: string
  installmentNumber: number
  date: string
  amount: string
  paidAmount: string | null
  remaining: string
  status: TransactionStatus
}

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly splitService: SplitService,
    private readonly statementRepository: StatementRepository
  ) {}

  async list(organizationId: string, filter: Omit<ListTransactionsFilter, 'organizationId'>) {
    const page = filter.page ?? 1
    const perPage = filter.perPage ?? 20

    if (filter.accountId) {
      await this.repairIncompleteInstallments(organizationId, filter.accountId)
    }

    let sortBy = filter.sortBy
    let sortOrder = filter.sortOrder

    if (!sortBy && filter.accountId) {
      const account = await this.accountRepository.findById(organizationId, filter.accountId)
      if (account?.type === 'credit_card') {
        sortBy = 'purchaseDate'
        sortOrder = 'asc'
      }
    }

    const result = await this.transactionRepository.findMany({
      organizationId,
      ...filter,
      sortBy,
      sortOrder,
      page,
      perPage,
    })

    const transactions = result.rows.map(row =>
      toTransactionDto(row, result.categoryIdsByTransaction.get(row.id) ?? [])
    )

    return {
      transactions,
      pagination: {
        page,
        perPage,
        total: result.total,
        totalPages: Math.ceil(result.total / perPage) || 0,
      },
    }
  }

  async get(organizationId: string, id: string): Promise<TransactionDto> {
    let transaction = await this.transactionRepository.findById(organizationId, id)

    if (!transaction) {
      throw notFound('Transaction not found')
    }

    if (
      transaction.installmentsTotal != null &&
      transaction.installmentsTotal >= 2 &&
      transaction.accountId
    ) {
      await this.repairIncompleteInstallments(organizationId, transaction.accountId)
      transaction = await this.transactionRepository.findById(organizationId, id)
      if (!transaction) {
        throw notFound('Transaction not found')
      }
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([transaction.id])

    return toTransactionDto(transaction, categoryMap.get(transaction.id) ?? [])
  }

  async create(
    organizationId: string,
    input: CreateTransactionInput
  ): Promise<CreateTransactionResult> {
    await this.validateReferences(organizationId, input)
    if (input.accountId) {
      await this.assertManualCreditCardCreateAllowed(
        organizationId,
        input.accountId,
        input.source ?? 'manual'
      )
    }
    const notifyTarget = await this.resolveNotifyFields(organizationId, input)

    const installmentRows = await this.buildCreditCardInstallmentRows(organizationId, input)
    if (installmentRows) {
      const createdRows = await this.transactionRepository.createMany(
        installmentRows.map(row => this.toCreateData(organizationId, row, notifyTarget))
      )

      const categoryIds = input.categoryIds ?? []
      const transactions = createdRows.map(row => toTransactionDto(row, categoryIds))
      const first = transactions.at(0)
      if (!first) throw badRequest('Failed to create installment transaction')

      return {
        transaction: first,
        installmentsCreated: createdRows.length,
        transactions,
      }
    }

    const periodicRows = await this.buildPeriodicInstallmentRows(organizationId, input)
    if (periodicRows) {
      const createdRows = await this.transactionRepository.createMany(
        periodicRows.map(row => this.toCreateData(organizationId, row, notifyTarget))
      )

      const categoryIds = input.categoryIds ?? []
      const transactions = createdRows.map(row => toTransactionDto(row, categoryIds))
      const first = transactions.at(0)
      if (!first) throw badRequest('Failed to create installment transaction')

      return {
        transaction: first,
        installmentsCreated: createdRows.length,
        transactions,
      }
    }

    const created = await this.transactionRepository.create(
      this.toCreateData(organizationId, input, notifyTarget)
    )

    return { transaction: toTransactionDto(created, input.categoryIds ?? []) }
  }

  async bulkCreate(
    organizationId: string,
    inputs: CreateTransactionInput[]
  ): Promise<TransactionDto[]> {
    const notifyTargets: Awaited<ReturnType<typeof this.resolveNotifyFields>>[] = []

    for (const input of inputs) {
      await this.validateReferences(organizationId, input)
      if (input.accountId) {
        await this.assertManualCreditCardCreateAllowed(
          organizationId,
          input.accountId,
          input.source ?? 'manual'
        )
      }
      notifyTargets.push(await this.resolveNotifyFields(organizationId, input))
    }

    const createdRows = await this.transactionRepository.createMany(
      inputs.map((input, index) => {
        const notifyTarget = notifyTargets[index]
        if (!notifyTarget) throw badRequest('Missing notify target for transaction')
        return this.toCreateData(organizationId, input, notifyTarget)
      })
    )

    return createdRows.map((row, index) => toTransactionDto(row, inputs[index]?.categoryIds ?? []))
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateTransactionInput
  ): Promise<TransactionDto> {
    const existing = await this.transactionRepository.findById(organizationId, id)

    if (!existing) {
      throw notFound('Transaction not found')
    }

    if (existing.status === 'paid') {
      throw badRequest('Paid transactions cannot be edited. Cancel the payment first.')
    }

    assertImportedStatementUpdateAllowed(existing, input)

    await this.validateReferences(organizationId, {
      accountId: input.accountId ?? existing.accountId,
      cardId: input.cardId ?? existing.cardId,
      categoryIds: input.categoryIds,
      type: input.type ?? existing.type,
    })

    const notifyTarget = await this.resolveNotifyFields(
      organizationId,
      input,
      notifyTargetFromRecord(existing)
    )

    const nextAmount =
      input.amount != null ? parseCentavos(input.amount) : existing.amount
    const paymentPatch = this.resolvePaymentFieldsForUpdate(existing, input, nextAmount)

    const updated = await this.transactionRepository.update(id, {
      accountId: input.accountId,
      cardId: input.cardId,
      recurringTransactionId: input.recurringTransactionId,
      statementId: input.statementId,
      title: input.title,
      description: input.description,
      amount: input.amount != null ? parseCentavos(input.amount) : undefined,
      type: input.type,
      date: input.date ? new Date(input.date) : undefined,
      competenceDate:
        input.competenceDate !== undefined
          ? input.competenceDate
            ? new Date(input.competenceDate)
            : null
          : undefined,
      counterparty: input.counterparty,
      installmentNumber: input.installmentNumber,
      installmentsTotal: input.installmentsTotal,
      source: input.source,
      categoryIds: input.categoryIds,
      transferPairId: input.transferPairId,
      ...notifyTarget,
      ...paymentPatch,
    })

    if (!updated) {
      throw notFound('Transaction not found')
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([updated.id])

    return toTransactionDto(updated, categoryMap.get(updated.id) ?? [])
  }

  async pay(
    organizationId: string,
    id: string,
    input: PayTransactionInput
  ): Promise<TransactionDto> {
    const advanceIds = input.advanceTransactionIds ?? []

    if (advanceIds.length > 0) {
      return this.payWithAdvance(organizationId, id, input)
    }

    return this.paySingle(organizationId, id, input)
  }

  async cancelPayment(organizationId: string, id: string): Promise<TransactionDto> {
    const existing = await this.transactionRepository.findById(organizationId, id)

    if (!existing) {
      throw notFound('Transaction not found')
    }

    if (existing.status === 'canceled') {
      throw badRequest('Cannot cancel payment on a canceled transaction')
    }

    if (existing.status !== 'paid') {
      throw badRequest('Transaction is not paid')
    }

    const updated = await this.transactionRepository.update(id, {
      status: 'pending',
      paidAmount: null,
      paidAt: null,
    })

    if (!updated) {
      throw notFound('Transaction not found')
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([updated.id])

    return toTransactionDto(updated, categoryMap.get(updated.id) ?? [])
  }

  async getInstallmentSeries(
    organizationId: string,
    transactionId: string
  ): Promise<{ installments: InstallmentSeriesItem[] }> {
    const anchor = await this.transactionRepository.findById(organizationId, transactionId)

    if (!anchor) {
      throw notFound('Transaction not found')
    }

    if (anchor.installmentsTotal == null || anchor.installmentsTotal < 2) {
      return { installments: [] }
    }

    if (anchor.accountId) {
      await this.repairIncompleteInstallments(organizationId, anchor.accountId)
    }

    const siblings = await this.findInstallmentSiblings(organizationId, anchor)

    return {
      installments: siblings.map(row => this.toInstallmentSeriesItem(row)),
    }
  }

  private async paySingle(
    organizationId: string,
    id: string,
    input: PayTransactionInput
  ): Promise<TransactionDto> {
    let transaction = await this.transactionRepository.findById(organizationId, id)

    if (!transaction) {
      throw notFound('Transaction not found')
    }

    if (
      transaction.installmentsTotal != null &&
      transaction.installmentsTotal >= 2 &&
      transaction.accountId
    ) {
      await this.repairIncompleteInstallments(organizationId, transaction.accountId)
      transaction =
        (await this.transactionRepository.findById(organizationId, id)) ?? transaction
    }

    if (transaction.status === 'canceled') {
      throw badRequest('Cannot pay a canceled transaction')
    }

    if (transaction.status === 'paid') {
      throw badRequest('Transaction is already paid')
    }

    const existingPaid = transaction.paidAmount ?? 0n
    const remaining = transactionRemainingAmount(transaction.amount, existingPaid)

    if (remaining <= 0n) {
      throw badRequest('Transaction is already paid')
    }

    const paymentAmount =
      input.paidAmount != null ? parseCentavos(input.paidAmount) : remaining

    if (paymentAmount <= 0n) {
      throw badRequest('Payment amount must be greater than zero')
    }

    if (paymentAmount > remaining) {
      throw badRequest(
        `Payment exceeds remaining amount (${centavosToString(remaining)})`
      )
    }

    const newPaidAmount = existingPaid + paymentAmount
    const status = computeTransactionStatus(
      transaction.amount,
      newPaidAmount,
      transaction.status
    )
    const paymentDate = input.paidAt ? new Date(input.paidAt) : new Date()
    const paidAt = resolveTransactionPaidAt(status, paymentDate, transaction.paidAt)

    const updated = await this.transactionRepository.update(id, {
      status,
      paidAt,
      paidAmount: newPaidAmount,
      paymentScheduledAt: null,
    })

    if (!updated) {
      throw notFound('Transaction not found')
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([updated.id])

    return toTransactionDto(updated, categoryMap.get(updated.id) ?? [])
  }

  async schedulePayment(
    organizationId: string,
    id: string,
    input: { scheduledAt: string }
  ): Promise<TransactionDto> {
    const existing = await this.transactionRepository.findById(organizationId, id)

    if (!existing) {
      throw notFound('Transaction not found')
    }

    if (existing.status === 'paid' || existing.status === 'canceled') {
      throw badRequest('Cannot schedule payment on a paid or canceled transaction')
    }

    const paymentScheduledAt = normalizeScheduledAt(input.scheduledAt)
    const updated = await this.transactionRepository.update(id, { paymentScheduledAt })

    if (!updated) {
      throw notFound('Transaction not found')
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([updated.id])
    return toTransactionDto(updated, categoryMap.get(updated.id) ?? [])
  }

  async cancelScheduledPayment(organizationId: string, id: string): Promise<TransactionDto> {
    const existing = await this.transactionRepository.findById(organizationId, id)

    if (!existing) {
      throw notFound('Transaction not found')
    }

    if (!existing.paymentScheduledAt) {
      throw badRequest('Transaction has no scheduled payment')
    }

    const updated = await this.transactionRepository.update(id, { paymentScheduledAt: null })

    if (!updated) {
      throw notFound('Transaction not found')
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([updated.id])
    return toTransactionDto(updated, categoryMap.get(updated.id) ?? [])
  }

  private async payWithAdvance(
    organizationId: string,
    id: string,
    input: PayTransactionInput
  ): Promise<TransactionDto> {
    const anchor = await this.transactionRepository.findById(organizationId, id)

    if (!anchor) {
      throw notFound('Transaction not found')
    }

    if (anchor.status === 'canceled') {
      throw badRequest('Cannot pay a canceled transaction')
    }

    if (anchor.status === 'paid') {
      throw badRequest('Transaction is already paid')
    }

    const advanceIds = input.advanceTransactionIds ?? []
    if (advanceIds.length === 0) {
      throw badRequest('advanceTransactionIds is required for advance payment')
    }

    if (
      anchor.installmentsTotal != null &&
      anchor.installmentsTotal >= 2 &&
      anchor.accountId
    ) {
      await this.repairIncompleteInstallments(organizationId, anchor.accountId)
    }

    const currentAnchor =
      (await this.transactionRepository.findById(organizationId, id)) ?? anchor

    const anchorRemaining = transactionRemainingAmount(
      currentAnchor.amount,
      currentAnchor.paidAmount
    )
    if (anchorRemaining <= 0n) {
      throw badRequest('Transaction is already paid')
    }

    const paymentAmount =
      input.paidAmount != null ? parseCentavos(input.paidAmount) : anchorRemaining

    if (paymentAmount <= 0n) {
      throw badRequest('Payment amount must be greater than zero')
    }

    const siblings = await this.findInstallmentSiblings(organizationId, currentAnchor)
    const advanceTransactions = siblings.filter(row => advanceIds.includes(row.id))

    if (advanceTransactions.length !== advanceIds.length) {
      throw badRequest('One or more advance installments were not found in this series')
    }

    const anchorNumber = currentAnchor.installmentNumber ?? 1

    for (const advance of advanceTransactions) {
      if (!matchesInstallmentSeries(advance, currentAnchor)) {
        throw badRequest('Advance installments must belong to the same series')
      }

      const advanceNumber = advance.installmentNumber ?? 1
      if (advanceNumber <= anchorNumber) {
        throw badRequest('Advance installments must be after the current installment')
      }

      if (advance.status === 'canceled' || advance.status === 'paid') {
        throw badRequest('Advance installment is not payable')
      }
    }

    const advanceRemainingTotal = advanceTransactions.reduce(
      (sum, row) => sum + transactionRemainingAmount(row.amount, row.paidAmount),
      0n
    )
    const expectedTotal = anchorRemaining + advanceRemainingTotal

    if (paymentAmount !== expectedTotal) {
      throw badRequest(
        `Payment amount must equal current and selected installments (${centavosToString(expectedTotal)})`
      )
    }

    const paymentDate = input.paidAt ? new Date(input.paidAt) : new Date()
    const targets = [
      currentAnchor,
      ...advanceTransactions.sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0)),
    ]

    await db.transaction(async tx => {
      for (const target of targets) {
        const existingPaid = target.paidAmount ?? 0n
        const remaining = transactionRemainingAmount(target.amount, existingPaid)
        if (remaining <= 0n) continue

        const newPaidAmount = existingPaid + remaining
        const status = computeTransactionStatus(target.amount, newPaidAmount, target.status)
        const paidAt = resolveTransactionPaidAt(status, paymentDate, target.paidAt)

        const [updated] = await tx
          .update(transactions)
          .set({
            status,
            paidAt,
            paidAmount: newPaidAmount,
            paymentScheduledAt: null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(transactions.id, target.id), eq(transactions.organizationId, organizationId))
          )
          .returning()

        if (!updated) {
          throw notFound('Transaction not found')
        }
      }
    })

    const updatedAnchor = await this.transactionRepository.findById(organizationId, id)

    if (!updatedAnchor) {
      throw notFound('Transaction not found')
    }

    const categoryMap = await this.transactionRepository.getCategoryIds([updatedAnchor.id])

    return toTransactionDto(updatedAnchor, categoryMap.get(updatedAnchor.id) ?? [])
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(organizationId, id)

    if (!transaction) {
      throw notFound('Transaction not found')
    }

    if (isImportedStatementTransaction(transaction)) {
      throw badRequest('Imported statement lines cannot be deleted')
    }

    if (transaction.transferPairId) {
      const pair = await this.transactionRepository.findById(
        organizationId,
        transaction.transferPairId
      )

      if (pair && isImportedStatementTransaction(pair)) {
        throw badRequest('Imported statement lines cannot be deleted')
      }
    }

    await this.transactionRepository.deleteWithTransferPair(id, transaction.transferPairId)
  }

  async bulkNotifyTarget(
    organizationId: string,
    updates: BulkNotifyTargetInput[]
  ): Promise<TransactionDto[]> {
    const resolvedUpdates: Array<{ id: string; data: ReturnType<typeof resolveNotifyTarget> }> = []

    for (const update of updates) {
      const existing = await this.transactionRepository.findById(
        organizationId,
        update.transactionId
      )

      if (!existing) {
        throw notFound(`Transaction not found: ${update.transactionId}`)
      }

      const notifyTarget = await this.resolveNotifyFields(
        organizationId,
        update,
        notifyTargetFromRecord(existing)
      )

      resolvedUpdates.push({ id: update.transactionId, data: notifyTarget })
    }

    const updatedRows = await this.transactionRepository.updateMany(
      organizationId,
      resolvedUpdates
    )

    const categoryMap = await this.transactionRepository.getCategoryIds(
      updatedRows.map(row => row.id)
    )

    return updatedRows.map(row => toTransactionDto(row, categoryMap.get(row.id) ?? []))
  }

  async bulkReviewImport(
    organizationId: string,
    updates: BulkReviewImportInput[]
  ): Promise<{ transactions: TransactionDto[]; splitsCreated: number }> {
    const updatedTransactions: TransactionDto[] = []
    let splitsCreated = 0

    for (const update of updates) {
      const existing = await this.transactionRepository.findById(
        organizationId,
        update.transactionId
      )

      if (!existing) {
        throw notFound(`Transaction not found: ${update.transactionId}`)
      }

      let current = toTransactionDto(
        existing,
        (await this.transactionRepository.getCategoryIds([existing.id])).get(existing.id) ?? []
      )

      if (update.categoryIds !== undefined) {
        await this.validateReferences(organizationId, {
          categoryIds: update.categoryIds,
          type: existing.type,
        })
        await this.transactionRepository.setCategories(update.transactionId, update.categoryIds)
        current = toTransactionDto(existing, update.categoryIds)
      }

      if (update.split) {
        await this.splitService.create(organizationId, update.transactionId, {
          userId: update.split.userId,
          contactName: update.split.contactName,
          contactPhone: update.split.contactPhone,
          amount: update.split.amount,
          description: update.split.description,
          notifyEnabled: true,
        })
        splitsCreated += 1
      }

      updatedTransactions.push(current)
    }

    return { transactions: updatedTransactions, splitsCreated }
  }

  private async buildCreditCardInstallmentRows(
    organizationId: string,
    input: CreateTransactionInput
  ): Promise<CreateTransactionInput[] | null> {
    const installmentsTotal = input.installmentsTotal
    if (!installmentsTotal || installmentsTotal < 2) return null
    if (input.type !== 'expense') return null
    if (input.installmentNumber != null && input.installmentNumber !== 1) return null

    let accountId = input.accountId ?? null
    if (!accountId && input.cardId) {
      const [card] = await db.select().from(cards).where(eq(cards.id, input.cardId)).limit(1)
      accountId = card?.accountId ?? null
    }

    if (!accountId) return null

    const account = await this.accountRepository.findById(organizationId, accountId)
    if (account?.type !== 'credit_card') return null
    if (account.closingDay == null || account.dueDay == null) {
      throw badRequest('Conta de cartão precisa de dia de fechamento e vencimento')
    }
    if (input.amount == null) {
      throw badRequest('Valor é obrigatório para parcelamento')
    }

    const rows = buildCreditCardInstallments({
      title: input.title,
      totalCentavos: parseCentavos(input.amount),
      purchaseDate: new Date(input.date),
      closingDay: account.closingDay,
      dueDay: account.dueDay,
      installmentsTotal,
    })

    return rows.map(row => ({
      ...input,
      accountId,
      title: row.title,
      amount: centavosToString(row.amount) ?? '0.00',
      date: row.date.toISOString(),
      competenceDate: row.competenceDate.toISOString(),
      installmentNumber: row.installmentNumber,
      installmentsTotal: row.installmentsTotal,
    }))
  }

  private async buildPeriodicInstallmentRows(
    organizationId: string,
    input: CreateTransactionInput
  ): Promise<CreateTransactionInput[] | null> {
    const installmentsTotal = input.installmentsTotal
    if (!installmentsTotal || installmentsTotal < 2) return null
    if (input.type !== 'expense') return null
    if (input.installmentNumber != null && input.installmentNumber !== 1) return null

    let accountId = input.accountId ?? null
    if (!accountId && input.cardId) {
      const [card] = await db.select().from(cards).where(eq(cards.id, input.cardId)).limit(1)
      accountId = card?.accountId ?? null
    }

    if (accountId) {
      const account = await this.accountRepository.findById(organizationId, accountId)
      if (account?.type === 'credit_card') return null
    }

    if (input.amount == null) {
      throw badRequest('Valor é obrigatório para parcelamento')
    }

    const rows = buildPeriodicInstallments({
      title: input.title,
      totalCentavos: parseCentavos(input.amount),
      startDate: new Date(input.date),
      installmentsTotal,
      periodicity: input.installmentPeriodicity,
    })

    return rows.map(row => ({
      ...input,
      accountId,
      title: row.title,
      amount: centavosToString(row.amount) ?? '0.00',
      date: row.date.toISOString(),
      competenceDate: row.competenceDate.toISOString(),
      installmentNumber: row.installmentNumber,
      installmentsTotal: row.installmentsTotal,
    }))
  }

  private async repairIncompleteInstallments(
    organizationId: string,
    accountId: string
  ): Promise<void> {
    const account = await this.accountRepository.findById(organizationId, accountId)
    if (!account) return

    if (account.type === 'credit_card') {
      await this.repairIncompleteCreditCardInstallments(organizationId, accountId)
      return
    }

    await this.repairIncompletePeriodicInstallments(organizationId, accountId)
  }

  private async repairIncompletePeriodicInstallments(
    organizationId: string,
    accountId: string
  ): Promise<void> {
    const rows = await this.transactionRepository.findManualInstallmentRows(
      organizationId,
      accountId
    )
    const groups = groupManualInstallmentSeries(rows)

    for (const group of groups) {
      if (!isIncompleteInstallmentSeries(group)) continue

      const plan = buildPeriodicInstallmentSeriesRepairPlan(group)
      const seed = group.rows.at(0)
      if (!seed) continue
      const categoryMap = await this.transactionRepository.getCategoryIds([seed.id])
      const categoryIds = categoryMap.get(seed.id) ?? []

      for (const update of plan.updates) {
        await this.transactionRepository.update(update.id, {
          title: update.row.title,
          amount: update.row.amount,
          date: update.row.date,
          competenceDate: update.row.competenceDate,
          installmentNumber: update.row.installmentNumber,
          installmentsTotal: update.row.installmentsTotal,
        })
      }

      if (plan.creates.length === 0) continue

      await this.transactionRepository.createMany(
        plan.creates.map(row => ({
          organizationId,
          accountId,
          cardId: seed.cardId,
          title: row.title,
          amount: row.amount,
          type: 'expense' as const,
          date: row.date,
          competenceDate: row.competenceDate,
          installmentNumber: row.installmentNumber,
          installmentsTotal: row.installmentsTotal,
          status: seed.status,
          source: 'manual' as const,
          categoryIds,
          notifyEnabled: false,
        }))
      )
    }
  }

  private async findInstallmentSiblings(
    organizationId: string,
    anchor: TransactionRecord
  ): Promise<TransactionRecord[]> {
    if (anchor.installmentsTotal == null || anchor.installmentsTotal < 2) {
      return [anchor]
    }

    const conditions = [
      eq(transactions.organizationId, organizationId),
      eq(transactions.installmentsTotal, anchor.installmentsTotal),
    ]

    if (anchor.accountId) {
      conditions.push(eq(transactions.accountId, anchor.accountId))
    }

    if (anchor.cardId) {
      conditions.push(eq(transactions.cardId, anchor.cardId))
    }

    const candidates = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(transactions.installmentNumber)

    const siblings = candidates.filter(candidate => matchesInstallmentSeries(candidate, anchor))

    return siblings.length > 0 ? siblings : [anchor]
  }

  private toInstallmentSeriesItem(transaction: TransactionRecord): InstallmentSeriesItem {
    const remaining = transactionRemainingAmount(transaction.amount, transaction.paidAmount)

    return {
      id: transaction.id,
      installmentNumber: transaction.installmentNumber ?? 1,
      date: transaction.date.toISOString(),
      amount: centavosToString(transaction.amount) ?? '0.00',
      paidAmount: centavosToString(transaction.paidAmount),
      remaining: centavosToString(remaining) ?? '0.00',
      status: transaction.status,
    }
  }

  private async repairIncompleteCreditCardInstallments(
    organizationId: string,
    accountId: string
  ): Promise<void> {
    const account = await this.accountRepository.findById(organizationId, accountId)
    if (account?.type !== 'credit_card') return
    if (account.closingDay == null || account.dueDay == null) return

    const rows = await this.transactionRepository.findManualInstallmentRows(
      organizationId,
      accountId
    )
    const groups = groupManualInstallmentSeries(rows)

    for (const group of groups) {
      if (!isIncompleteInstallmentSeries(group)) continue

      const plan = buildInstallmentSeriesRepairPlan(
        group,
        account.closingDay,
        account.dueDay
      )
      const seed = group.rows.at(0)
      if (!seed) continue
      const categoryMap = await this.transactionRepository.getCategoryIds([seed.id])
      const categoryIds = categoryMap.get(seed.id) ?? []

      for (const update of plan.updates) {
        await this.transactionRepository.update(update.id, {
          title: update.row.title,
          amount: update.row.amount,
          date: update.row.date,
          competenceDate: update.row.competenceDate,
          installmentNumber: update.row.installmentNumber,
          installmentsTotal: update.row.installmentsTotal,
        })
      }

      if (plan.creates.length === 0) continue

      await this.transactionRepository.createMany(
        plan.creates.map(row => ({
          organizationId,
          accountId,
          cardId: seed.cardId,
          title: row.title,
          amount: row.amount,
          type: 'expense' as const,
          date: row.date,
          competenceDate: row.competenceDate,
          installmentNumber: row.installmentNumber,
          installmentsTotal: row.installmentsTotal,
          status: seed.status,
          source: 'manual' as const,
          categoryIds,
          notifyEnabled: false,
        }))
      )
    }
  }

  private resolvePaymentFieldsForUpdate(
    existing: TransactionRecord,
    input: UpdateTransactionInput,
    nextAmount: bigint | null
  ): {
    status?: TransactionStatus
    paidAmount?: bigint | null
    paidAt?: Date | null
  } {
    if (input.paidAmount != null) {
      const paidAmount = parseCentavos(input.paidAmount)

      if (nextAmount != null && paidAmount > nextAmount) {
        throw badRequest(
          `Paid amount exceeds transaction amount (${centavosToString(nextAmount)})`
        )
      }

      const status = computeTransactionStatus(nextAmount, paidAmount, existing.status)
      const paymentDate = input.paidAt ? new Date(input.paidAt) : new Date()

      return {
        paidAmount,
        status,
        paidAt: resolveTransactionPaidAt(status, paymentDate, existing.paidAt),
      }
    }

    if (input.status === 'paid' && existing.status !== 'paid') {
      const paidAmount = nextAmount ?? existing.paidAmount ?? 0n

      return {
        status: 'paid',
        paidAmount,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      }
    }

    if (input.status === 'pending') {
      if ((existing.paidAmount ?? 0n) > 0n) {
        throw badRequest('Cannot revert to pending while payments are recorded')
      }

      return {
        status: 'pending',
        paidAmount: null,
        paidAt: null,
      }
    }

    if (input.status !== undefined) {
      return { status: input.status }
    }

    if (input.amount != null && existing.paidAmount != null) {
      return {
        status: computeTransactionStatus(nextAmount, existing.paidAmount, existing.status),
      }
    }

    if (input.paidAt !== undefined) {
      return {
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
      }
    }

    return {}
  }

  private toCreateData(
    organizationId: string,
    input: CreateTransactionInput,
    notifyTarget: ReturnType<typeof resolveNotifyTarget>
  ) {
    return {
      organizationId,
      accountId: input.accountId ?? null,
      cardId: input.cardId ?? null,
      recurringTransactionId: input.recurringTransactionId ?? null,
      statementId: input.statementId ?? null,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount != null ? parseCentavos(input.amount) : null,
      type: input.type,
      date: new Date(input.date),
      competenceDate: input.competenceDate ? new Date(input.competenceDate) : null,
      status: input.status,
      paidAt: input.paidAt ? new Date(input.paidAt) : null,
      paidAmount: input.paidAmount != null ? parseCentavos(input.paidAmount) : null,
      counterparty: input.counterparty ?? null,
      installmentNumber: input.installmentNumber ?? null,
      installmentsTotal: input.installmentsTotal ?? null,
      source: input.source,
      categoryIds: input.categoryIds,
      transferPairId: input.transferPairId ?? null,
      ...notifyTarget,
    }
  }

  private async resolveNotifyFields(
    organizationId: string,
    input: NotifyTargetInput,
    existing?: ReturnType<typeof notifyTargetFromRecord> | null
  ) {
    const hasNotifyInput =
      input.notifyEnabled !== undefined ||
      input.notifyTargetType !== undefined ||
      input.notifyUserId !== undefined ||
      input.notifyContactName !== undefined ||
      input.notifyContactPhone !== undefined ||
      input.notifyDaysBefore !== undefined ||
      input.notifyOverdueConfig !== undefined

    if (!hasNotifyInput) {
      return existing ?? resolveNotifyTarget({ notifyEnabled: false })
    }

    const resolved = resolveNotifyTarget(input, existing)

    if (resolved.notifyEnabled && resolved.notifyTargetType === 'member' && resolved.notifyUserId) {
      await assertNotifyUserBelongsToOrg(organizationId, resolved.notifyUserId)
    }

    return resolved
  }

  private async validateReferences(
    organizationId: string,
    input: {
      accountId?: string | null
      cardId?: string | null
      categoryIds?: string[]
      type?: TransactionType
    }
  ): Promise<void> {
    if (input.accountId) {
      const account = await this.accountRepository.findById(organizationId, input.accountId)

      if (!account) {
        throw badRequest('Conta não encontrada')
      }

      if (!account.isActive) {
        throw badRequest('Conta inativa — selecione outra conta')
      }
    }

    if (input.cardId) {
      const [card] = await db.select().from(cards).where(eq(cards.id, input.cardId)).limit(1)

      if (!card) {
        throw badRequest('Cartão não encontrado')
      }

      if (input.accountId && card.accountId !== input.accountId) {
        throw badRequest(
          'O cartão selecionado não pertence a esta conta. Selecione novamente a conta e o cartão.'
        )
      }

      if (input.accountId == null) {
        const account = await this.accountRepository.findById(organizationId, card.accountId)

        if (!account) {
          throw badRequest('Conta do cartão não encontrada')
        }

        if (!account.isActive) {
          throw badRequest('Conta do cartão está inativa')
        }
      }
    }

    if (input.categoryIds?.length) {
      if (!input.type) {
        throw badRequest('Informe o tipo do lançamento ao selecionar categorias')
      }

      for (const categoryId of input.categoryIds) {
        const category = await this.categoryRepository.findById(organizationId, categoryId)

        if (!category || !category.isActive) {
          throw badRequest('Categoria não encontrada ou inativa')
        }

        if (category.type !== input.type) {
          throw badRequest(
            `A categoria "${category.name}" é de ${category.type === 'income' ? 'receita' : 'despesa'} e não pode ser usada neste lançamento`
          )
        }
      }
    }
  }

  private async assertManualCreditCardCreateAllowed(
    organizationId: string,
    accountId: string,
    source: TransactionSource
  ): Promise<void> {
    if (source === 'import' || source === 'recurring') return

    const account = await this.accountRepository.findById(organizationId, accountId)
    if (!account || account.type !== 'credit_card') return

    const hasImported = await this.statementRepository.hasAnyForAccount(organizationId, accountId)
    if (hasImported) {
      throw badRequest(
        'Lançamentos manuais não estão disponíveis após importar o extrato do cartão. Use Importar fatura para adicionar compras.'
      )
    }
  }
}
