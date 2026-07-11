import type {
  RecurringFrequency,
  RecurringTransactionType,
} from '@/db/schemas/recurringTransactions'
import { badRequest, notFound } from '@/core/errors'
import { centavosToString, parseCentavos } from '@/core/money'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import type { RecurringRecord, RecurringRepository } from './recurring.repository'

export type RecurringDto = {
  id: string
  organizationId: string
  accountId: string | null
  title: string
  amount: string
  type: RecurringTransactionType
  counterparty: string | null
  categoryId: string | null
  frequency: RecurringFrequency
  interval: number
  startDate: string
  endDate: string | null
  installmentsTotal: number | null
  isActive: boolean
  lastGeneratedDate: string | null
  createdAt: string
  updatedAt: string
}

function toRecurringDto(row: RecurringRecord): RecurringDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    accountId: row.accountId,
    title: row.title,
    amount: centavosToString(row.amount) ?? '0.00',
    type: row.type,
    counterparty: row.counterparty,
    categoryId: row.categoryId,
    frequency: row.frequency,
    interval: row.interval,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate?.toISOString() ?? null,
    installmentsTotal: row.installmentsTotal,
    isActive: row.isActive,
    lastGeneratedDate: row.lastGeneratedDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type CreateRecurringInput = {
  title: string
  amount: string
  type: RecurringTransactionType
  counterparty?: string | null
  categoryId?: string | null
  accountId?: string | null
  frequency: RecurringFrequency
  interval?: number
  startDate: string
  endDate?: string | null
  installmentsTotal?: number | null
}

export type UpdateRecurringInput = Partial<CreateRecurringInput> & {
  effectiveFrom?: string
}

export type PreviewUpdateInput = UpdateRecurringInput

export type PreviewUpdateImpact = {
  preservedPastCount: number
  updatedFuturePendingCount: number
  unchangedCount: number
}

export type PreviewUpdateResult = {
  current: RecurringDto
  proposed: RecurringDto
  impact: PreviewUpdateImpact
}

export type CreateRecurringResult = {
  recurringTransaction: RecurringDto
  materializedCount: number
  nextOccurrenceDate: string | null
}

export type MaterializeResult = {
  processed: number
  generated: number
  errors: number
}

export type RecurringPropagationData = {
  amount?: bigint
  title?: string
  accountId?: string | null
  counterparty?: string | null
  categoryId?: string | null
}

export class RecurringService {
  constructor(
    private readonly recurringRepository: RecurringRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository
  ) {}

  async list(organizationId: string): Promise<RecurringDto[]> {
    const rows = await this.recurringRepository.findAllByOrganization(organizationId)
    return rows.map(toRecurringDto)
  }

  async get(organizationId: string, id: string): Promise<RecurringDto> {
    const row = await this.recurringRepository.findById(organizationId, id)

    if (!row || !row.isActive) {
      throw notFound('Recurring transaction not found')
    }

    return toRecurringDto(row)
  }

  async create(organizationId: string, input: CreateRecurringInput): Promise<CreateRecurringResult> {
    await this.validateReferences(organizationId, input)

    const created = await this.recurringRepository.create({
      organizationId,
      accountId: input.accountId ?? null,
      title: input.title,
      amount: parseCentavos(input.amount),
      type: input.type,
      counterparty: input.counterparty ?? null,
      categoryId: input.categoryId ?? null,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      installmentsTotal: input.installmentsTotal ?? null,
    })

    const materializedCount = await this.materializeOne(created, {
      horizonDate: startOfDay(created.startDate),
    })

    const refreshed = await this.recurringRepository.findById(organizationId, created.id)
    const row = refreshed ?? created

    return {
      recurringTransaction: toRecurringDto(row),
      materializedCount,
      nextOccurrenceDate: computeNextOccurrenceDate(row),
    }
  }

  async previewUpdate(
    organizationId: string,
    id: string,
    input: PreviewUpdateInput
  ): Promise<PreviewUpdateResult> {
    const existing = await this.recurringRepository.findById(organizationId, id)

    if (!existing || !existing.isActive) {
      throw notFound('Recurring transaction not found')
    }

    this.assertEditableFields(existing, input)

    const effectiveFrom = resolveEffectiveFrom(input.effectiveFrom)
    const proposedRow = mergeRecurringInput(existing, input)
    const proposed = toRecurringDto(proposedRow)
    const current = toRecurringDto(existing)
    const propagation = buildPropagationData(existing, input)

    const transactions = await this.transactionRepository.findByRecurringId(organizationId, id)
    const impact = computeUpdateImpact(transactions, effectiveFrom, propagation)

    return { current, proposed, impact }
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateRecurringInput
  ): Promise<RecurringDto> {
    const existing = await this.recurringRepository.findById(organizationId, id)

    if (!existing || !existing.isActive) {
      throw notFound('Recurring transaction not found')
    }

    this.assertEditableFields(existing, input)

    await this.validateReferences(organizationId, {
      accountId: input.accountId ?? existing.accountId,
      categoryId: input.categoryId ?? existing.categoryId,
    })

    const effectiveFrom = resolveEffectiveFrom(input.effectiveFrom)
    const propagation = buildPropagationData(existing, input)

    const updated = await this.recurringRepository.update(id, {
      accountId: input.accountId,
      title: input.title,
      amount: input.amount != null ? parseCentavos(input.amount) : undefined,
      counterparty: input.counterparty,
      categoryId: input.categoryId,
      frequency: input.frequency,
      interval: input.interval,
      endDate:
        input.endDate !== undefined
          ? input.endDate
            ? new Date(input.endDate)
            : null
          : undefined,
      installmentsTotal: input.installmentsTotal,
    })

    if (!updated) {
      throw notFound('Recurring transaction not found')
    }

    if (Object.keys(propagation).length > 0) {
      await this.transactionRepository.updatePendingFromDate(
        organizationId,
        id,
        effectiveFrom,
        propagation
      )
    }

    return toRecurringDto(updated)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await this.recurringRepository.findById(organizationId, id)

    if (!existing || !existing.isActive) {
      throw notFound('Recurring transaction not found')
    }

    await this.recurringRepository.softDelete(id)
  }

  async materializeOccurrences(): Promise<MaterializeResult> {
    const rows = await this.recurringRepository.findActiveForMaterialization()
    let generated = 0
    let errors = 0

    for (const row of rows) {
      try {
        generated += await this.materializeOne(row, { horizonDate: startOfDay(new Date()) })
      } catch {
        errors += 1
      }
    }

    return {
      processed: rows.length,
      generated,
      errors,
    }
  }

  async materializeOne(
    row: RecurringRecord,
    options?: { horizonDate?: Date }
  ): Promise<number> {
    const horizonDate = startOfDay(options?.horizonDate ?? new Date())
    const startDate = startOfDay(row.startDate)
    const endDate = row.endDate ? startOfDay(row.endDate) : null

    if (startDate > horizonDate) {
      return 0
    }

    let installmentNumber = 0

    if (row.lastGeneratedDate) {
      let cursor = startDate
      const lastGenerated = startOfDay(row.lastGeneratedDate)

      while (cursor <= lastGenerated) {
        installmentNumber++
        cursor = addPeriod(cursor, row.frequency, row.interval)
      }
    }

    let nextDate = row.lastGeneratedDate
      ? addPeriod(startOfDay(row.lastGeneratedDate), row.frequency, row.interval)
      : startDate

    const toCreate: Array<{
      date: Date
      installmentNumber: number | null
    }> = []

    while (nextDate <= horizonDate) {
      installmentNumber++

      if (row.installmentsTotal && installmentNumber > row.installmentsTotal) {
        break
      }

      if (endDate && nextDate > endDate) {
        break
      }

      toCreate.push({
        date: new Date(nextDate),
        installmentNumber: row.installmentsTotal ? installmentNumber : null,
      })

      nextDate = addPeriod(nextDate, row.frequency, row.interval)
    }

    if (toCreate.length === 0) {
      return 0
    }

    const lastItem = toCreate.at(-1)
    const lastGeneratedDate = lastItem?.date as Date

    await this.transactionRepository.createMany(
      toCreate.map(item => ({
        organizationId: row.organizationId,
        accountId: row.accountId,
        recurringTransactionId: row.id,
        title: row.title,
        // Template may store 0 as reminder-without-value; prefer null on occurrences.
        amount: row.amount > 0n ? row.amount : null,
        type: row.type,
        date: item.date,
        competenceDate: item.date,
        status: 'pending' as const,
        counterparty: row.counterparty,
        installmentNumber: item.installmentNumber,
        installmentsTotal: row.installmentsTotal,
        source: 'recurring' as const,
        categoryIds: row.categoryId ? [row.categoryId] : undefined,
      }))
    )

    await this.recurringRepository.update(row.id, { lastGeneratedDate })

    return toCreate.length
  }

  private assertEditableFields(
    existing: RecurringRecord,
    input: UpdateRecurringInput
  ): void {
    if (input.type != null && input.type !== existing.type) {
      throw badRequest('Recurring transaction type cannot be changed')
    }

    if (input.startDate != null) {
      const nextStart = startOfDay(new Date(input.startDate)).getTime()
      const currentStart = startOfDay(existing.startDate).getTime()
      if (nextStart !== currentStart) {
        throw badRequest('Recurring transaction start date cannot be changed')
      }
    }
  }

  private async validateReferences(
    organizationId: string,
    input: { accountId?: string | null; categoryId?: string | null }
  ): Promise<void> {
    if (input.accountId) {
      const account = await this.accountRepository.findById(organizationId, input.accountId)

      if (!account || !account.isActive) {
        throw badRequest('Account not found')
      }

      if (account.type === 'credit_card') {
        throw badRequest('Recurring transactions cannot use credit card accounts')
      }
    }

    if (input.categoryId) {
      const category = await this.categoryRepository.findById(organizationId, input.categoryId)

      if (!category || !category.isActive) {
        throw badRequest('Category not found')
      }
    }
  }
}

function resolveEffectiveFrom(value?: string): Date {
  if (value) {
    return startOfDay(new Date(value))
  }

  return startOfDay(new Date())
}

function mergeRecurringInput(existing: RecurringRecord, input: PreviewUpdateInput): RecurringRecord {
  return {
    ...existing,
    accountId: input.accountId !== undefined ? input.accountId : existing.accountId,
    title: input.title ?? existing.title,
    amount: input.amount != null ? parseCentavos(input.amount) : existing.amount,
    counterparty: input.counterparty !== undefined ? input.counterparty : existing.counterparty,
    categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
    frequency: input.frequency ?? existing.frequency,
    interval: input.interval ?? existing.interval,
    endDate:
      input.endDate !== undefined
        ? input.endDate
          ? new Date(input.endDate)
          : null
        : existing.endDate,
    installmentsTotal:
      input.installmentsTotal !== undefined ? input.installmentsTotal : existing.installmentsTotal,
  }
}

function buildPropagationData(
  existing: RecurringRecord,
  input: PreviewUpdateInput
): RecurringPropagationData {
  const data: RecurringPropagationData = {}

  if (input.amount != null) {
    const nextAmount = parseCentavos(input.amount)
    if (nextAmount !== existing.amount) {
      data.amount = nextAmount
    }
  }

  if (input.title != null && input.title !== existing.title) {
    data.title = input.title
  }

  if (input.accountId !== undefined && input.accountId !== existing.accountId) {
    data.accountId = input.accountId
  }

  if (input.counterparty !== undefined && input.counterparty !== existing.counterparty) {
    data.counterparty = input.counterparty
  }

  if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) {
    data.categoryId = input.categoryId
  }

  return data
}

function computeUpdateImpact(
  transactions: TransactionRecord[],
  effectiveFrom: Date,
  propagation: RecurringPropagationData
): PreviewUpdateImpact {
  let preservedPastCount = 0
  let updatedFuturePendingCount = 0
  let unchangedCount = 0

  const hasPropagation = Object.keys(propagation).length > 0

  for (const transaction of transactions) {
    const txDate = startOfDay(transaction.date)

    if (
      transaction.status === 'paid' ||
      transaction.status === 'canceled' ||
      txDate < effectiveFrom
    ) {
      preservedPastCount++
      continue
    }

    if (transaction.status !== 'pending' || txDate < effectiveFrom) {
      unchangedCount++
      continue
    }

    if (!hasPropagation || !transactionWouldChange(transaction, propagation)) {
      unchangedCount++
      continue
    }

    updatedFuturePendingCount++
  }

  return { preservedPastCount, updatedFuturePendingCount, unchangedCount }
}

function transactionWouldChange(
  transaction: TransactionRecord,
  propagation: RecurringPropagationData
): boolean {
  if (propagation.amount !== undefined && transaction.amount !== propagation.amount) {
    return true
  }

  if (propagation.title !== undefined && transaction.title !== propagation.title) {
    return true
  }

  if (propagation.accountId !== undefined && transaction.accountId !== propagation.accountId) {
    return true
  }

  if (
    propagation.counterparty !== undefined &&
    transaction.counterparty !== propagation.counterparty
  ) {
    return true
  }

  if (propagation.categoryId !== undefined) {
    return true
  }

  return false
}

function computeNextOccurrenceDate(row: RecurringRecord): string | null {
  const cursor = row.lastGeneratedDate ? startOfDay(row.lastGeneratedDate) : startOfDay(row.startDate)
  const endDate = row.endDate ? startOfDay(row.endDate) : null

  let installmentNumber = 0
  let current = startOfDay(row.startDate)

  while (current <= cursor) {
    installmentNumber++
    if (row.installmentsTotal && installmentNumber >= row.installmentsTotal) {
      return null
    }
    if (current.getTime() === cursor.getTime()) {
      break
    }
    current = addPeriod(current, row.frequency, row.interval)
  }

  const next = addPeriod(cursor, row.frequency, row.interval)

  if (row.installmentsTotal && installmentNumber >= row.installmentsTotal) {
    return null
  }

  if (endDate && next > endDate) {
    return null
  }

  return next.toISOString()
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addPeriod(date: Date, frequency: RecurringFrequency, interval: number): Date {
  const result = new Date(date)

  switch (frequency) {
    case 'daily':
      result.setDate(result.getDate() + interval)
      break
    case 'weekly':
      result.setDate(result.getDate() + 7 * interval)
      break
    case 'monthly':
      result.setMonth(result.getMonth() + interval)
      break
    case 'yearly':
      result.setFullYear(result.getFullYear() + interval)
      break
  }

  return startOfDay(result)
}
