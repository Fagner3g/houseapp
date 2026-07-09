import { badRequest, notFound } from '@/core/errors'
import { centavosToString, parseCentavos } from '@/core/money'
import type { SplitPaymentMethod } from '@/db/schemas/splitPayments'
import type { SplitStatus } from '@/db/schemas/transactionSplits'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'

import type {
  SplitPaymentRecord,
  SplitRecord,
  SplitRepository,
} from './split.repository'
import {
  buildSplitDebtSummary,
  matchesInstallmentSeries,
  type SplitDebtSummary,
} from './split-debt-summary.logic'

export type SplitDto = {
  id: string
  transactionId: string
  userId: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  amount: string
  description: string | null
  status: SplitStatus
  paidAmount: string
  paidAt: string | null
  isNotified: boolean
  lastNotifiedAt: string | null
  notifyEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type SplitPaymentDto = {
  id: string
  splitId: string
  amount: string
  paidAt: string
  method: SplitPaymentMethod | null
  note: string | null
  createdAt: string
}

export type PendingSplitDto = SplitDto & {
  transactionTitle: string
  transactionDate: string
  transactionAmount: string | null
  personName: string | null
}

export type { SplitDebtSummary }

function toSplitDto(split: SplitRecord): SplitDto {
  return {
    id: split.id,
    transactionId: split.transactionId,
    userId: split.userId,
    contactName: split.contactName,
    contactPhone: split.contactPhone,
    contactEmail: split.contactEmail,
    amount: centavosToString(split.amount) ?? '0.00',
    description: split.description,
    status: split.status,
    paidAmount: centavosToString(split.paidAmount) ?? '0.00',
    paidAt: split.paidAt?.toISOString() ?? null,
    isNotified: split.isNotified,
    lastNotifiedAt: split.lastNotifiedAt?.toISOString() ?? null,
    notifyEnabled: split.notifyEnabled,
    createdAt: split.createdAt.toISOString(),
    updatedAt: split.updatedAt.toISOString(),
  }
}

function toPaymentDto(payment: SplitPaymentRecord): SplitPaymentDto {
  return {
    id: payment.id,
    splitId: payment.splitId,
    amount: centavosToString(payment.amount) ?? '0.00',
    paidAt: payment.paidAt.toISOString(),
    method: payment.method,
    note: payment.note,
    createdAt: payment.createdAt.toISOString(),
  }
}

export type CreateSplitInput = {
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  amount: string
  description?: string | null
  notifyEnabled?: boolean
}

export type UpdateSplitInput = Partial<CreateSplitInput & { status: SplitStatus }>

export type RegisterPaymentInput = {
  amount: string
  paidAt?: string | null
  method?: SplitPaymentMethod | null
  note?: string | null
}

export class SplitService {
  constructor(
    private readonly splitRepository: SplitRepository,
    private readonly transactionRepository: TransactionRepository
  ) {}

  async listByTransaction(organizationId: string, transactionId: string): Promise<SplitDto[]> {
    await this.ensureTransaction(organizationId, transactionId)

    const splits = await this.splitRepository.findByTransaction(transactionId)
    return splits.map(toSplitDto)
  }

  async create(
    organizationId: string,
    transactionId: string,
    input: CreateSplitInput
  ): Promise<SplitDto> {
    await this.ensureTransaction(organizationId, transactionId)
    this.validatePerson(input)

    const created = await this.splitRepository.create({
      transactionId,
      userId: input.userId ?? null,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail ?? null,
      amount: parseCentavos(input.amount),
      description: input.description ?? null,
      notifyEnabled: input.notifyEnabled,
    })

    return toSplitDto(created)
  }

  async update(
    organizationId: string,
    transactionId: string,
    id: string,
    input: UpdateSplitInput
  ): Promise<SplitDto> {
    await this.ensureTransaction(organizationId, transactionId)

    const existing = await this.splitRepository.findById(transactionId, id)

    if (!existing) {
      throw notFound('Split not found')
    }

    if (input.userId !== undefined || input.contactName !== undefined) {
      this.validatePerson({
        userId: input.userId ?? existing.userId,
        contactName: input.contactName ?? existing.contactName,
      })
    }

    const updated = await this.splitRepository.update(id, {
      userId: input.userId,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      amount: input.amount != null ? parseCentavos(input.amount) : undefined,
      description: input.description,
      status: input.status,
      notifyEnabled: input.notifyEnabled,
    })

    if (!updated) {
      throw notFound('Split not found')
    }

    return toSplitDto(updated)
  }

  async delete(organizationId: string, transactionId: string, id: string): Promise<void> {
    await this.ensureTransaction(organizationId, transactionId)

    const deleted = await this.splitRepository.delete(id)

    if (!deleted) {
      throw notFound('Split not found')
    }
  }

  async listPayments(
    organizationId: string,
    transactionId: string,
    splitId: string
  ): Promise<SplitPaymentDto[]> {
    await this.ensureSplit(organizationId, transactionId, splitId)

    const payments = await this.splitRepository.findPayments(splitId)
    return payments.map(toPaymentDto)
  }

  async registerPayment(
    organizationId: string,
    transactionId: string,
    splitId: string,
    input: RegisterPaymentInput
  ): Promise<{ payment: SplitPaymentDto; split: SplitDto }> {
    const split = await this.ensureSplit(organizationId, transactionId, splitId)

    if (split.status === 'forgiven') {
      throw badRequest('Cannot register payment on a forgiven split')
    }

    if (split.status === 'paid') {
      throw badRequest('Split is already fully paid')
    }

    const paymentAmount = parseCentavos(input.amount)
    const remaining = split.amount - split.paidAmount

    if (paymentAmount > remaining) {
      throw badRequest(`Payment exceeds remaining amount (${centavosToString(remaining)})`)
    }

    const result = await this.splitRepository.createPayment({
      splitId,
      amount: paymentAmount,
      paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
      method: input.method ?? null,
      note: input.note ?? null,
    })

    return {
      payment: toPaymentDto(result.payment),
      split: toSplitDto(result.split),
    }
  }

  async cancelPayment(
    organizationId: string,
    transactionId: string,
    splitId: string,
    paymentId: string
  ): Promise<{ split: SplitDto }> {
    await this.ensureSplit(organizationId, transactionId, splitId)

    const payment = await this.splitRepository.findPayment(splitId, paymentId)
    if (!payment) {
      throw notFound('Payment not found')
    }

    const split = await this.splitRepository.deletePayment(splitId, paymentId)
    if (!split) {
      throw notFound('Payment not found')
    }

    return { split: toSplitDto(split) }
  }

  async listPending(organizationId: string, userId: string): Promise<PendingSplitDto[]> {
    const rows = await this.splitRepository.listPendingByOrganization(organizationId, userId)

    return rows.map(row => ({
      ...toSplitDto(row),
      transactionTitle: row.transactionTitle,
      transactionDate: row.transactionDate.toISOString(),
      transactionAmount: centavosToString(row.transactionAmount),
      personName: row.personName,
    }))
  }

  async listTransactionIdsWithSplits(
    organizationId: string,
    transactionIds: string[]
  ): Promise<{
    transactionIds: string[]
    fullyDelegated: Array<{ transactionId: string; delegateName: string }>
    partiallyDivided: Array<{
      transactionId: string
      splitWithName: string
      splitAmount: string
      transactionAmount: string
    }>
    splitPaidTotals: Array<{ transactionId: string; paidAmount: string }>
  }> {
    const [transactionIdsWithSplits, fullyDelegated, partiallyDividedRows, splitPaidRows] =
      await Promise.all([
      this.splitRepository.listTransactionIdsWithSplits(organizationId, transactionIds),
      this.splitRepository.listFullyDelegatedTransactions(organizationId, transactionIds),
      this.splitRepository.listPartiallyDividedTransactions(organizationId, transactionIds),
      this.splitRepository.listSplitPaidTotals(organizationId, transactionIds),
    ])

    const partiallyDivided = partiallyDividedRows.map(row => ({
      transactionId: row.transactionId,
      splitWithName: row.splitWithName,
      splitAmount: centavosToString(row.splitAmount),
      transactionAmount: centavosToString(row.transactionAmount),
    }))

    return {
      transactionIds: transactionIdsWithSplits,
      fullyDelegated,
      partiallyDivided,
      splitPaidTotals: splitPaidRows.map(row => ({
        transactionId: row.transactionId,
        paidAmount: centavosToString(row.paidTotal) ?? '0.00',
      })),
    }
  }

  async getSplitDebtSummary(
    organizationId: string,
    transactionId: string
  ): Promise<SplitDebtSummary> {
    const anchor = await this.ensureTransaction(organizationId, transactionId)

    const siblingTransactions =
      anchor.installmentsTotal != null && anchor.installmentsTotal > 1
        ? (
            await this.splitRepository.findInstallmentSiblingCandidates(
              organizationId,
              anchor
            )
          ).filter(candidate => matchesInstallmentSeries(candidate, anchor))
        : [anchor]

    const transactionIds = siblingTransactions.map(row => row.id)
    const splits = await this.splitRepository.findSplitsWithTransactions(transactionIds)

    return buildSplitDebtSummary({
      anchorTransaction: anchor,
      siblingTransactions,
      splits,
      resolvePersonName: split =>
        split.userId ? (split.userName ?? 'Membro') : (split.contactName ?? 'Contato'),
    })
  }

  private validatePerson(input: { userId?: string | null; contactName?: string | null }): void {
    if (!input.userId && !input.contactName) {
      throw badRequest('Either userId or contactName is required')
    }
  }

  private async ensureTransaction(organizationId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findById(organizationId, transactionId)

    if (!transaction) {
      throw notFound('Transaction not found')
    }

    return transaction
  }

  private async ensureSplit(organizationId: string, transactionId: string, splitId: string) {
    await this.ensureTransaction(organizationId, transactionId)

    const split = await this.splitRepository.findById(transactionId, splitId)

    if (!split) {
      throw notFound('Split not found')
    }

    return split
  }
}
