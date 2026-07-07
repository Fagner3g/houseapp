import type {
  RecurringFrequency,
  RecurringTransactionType,
} from '@/db/schemas/recurringTransactions'
import { badRequest, notFound } from '@/core/errors'
import { centavosToString, parseCentavos } from '@/core/money'
import type { AccountRepository } from '@/modules/accounts/account.repository'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'

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

export type UpdateRecurringInput = Partial<CreateRecurringInput>

export type MaterializeResult = {
  processed: number
  generated: number
  errors: number
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

  async create(organizationId: string, input: CreateRecurringInput): Promise<RecurringDto> {
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

    return toRecurringDto(created)
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

    await this.validateReferences(organizationId, {
      accountId: input.accountId ?? existing.accountId,
      categoryId: input.categoryId ?? existing.categoryId,
    })

    const updated = await this.recurringRepository.update(id, {
      accountId: input.accountId,
      title: input.title,
      amount: input.amount != null ? parseCentavos(input.amount) : undefined,
      type: input.type,
      counterparty: input.counterparty,
      categoryId: input.categoryId,
      frequency: input.frequency,
      interval: input.interval,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
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
        generated += await this.materializeOne(row)
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

  private async materializeOne(row: RecurringRecord): Promise<number> {
    const today = startOfDay(new Date())
    const startDate = startOfDay(row.startDate)
    const endDate = row.endDate ? startOfDay(row.endDate) : null

    if (startDate > today) {
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

    while (nextDate <= today) {
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

    const lastGeneratedDate = toCreate[toCreate.length - 1]!.date

    await this.transactionRepository.createMany(
      toCreate.map(item => ({
        organizationId: row.organizationId,
        accountId: row.accountId,
        recurringTransactionId: row.id,
        title: row.title,
        amount: row.amount,
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

  private async validateReferences(
    organizationId: string,
    input: { accountId?: string | null; categoryId?: string | null }
  ): Promise<void> {
    if (input.accountId) {
      const account = await this.accountRepository.findById(organizationId, input.accountId)

      if (!account || !account.isActive) {
        throw badRequest('Account not found')
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
