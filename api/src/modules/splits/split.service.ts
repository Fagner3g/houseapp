import { badRequest, forbidden, notFound } from '@/core/errors'
import { centavosToString, parseCentavos } from '@/core/money'
import type { SplitPaymentMethod } from '@/db/schemas/splitPayments'
import type { SplitStatus } from '@/db/schemas/transactionSplits'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import {
  canMutateTransaction,
  type TransactionViewer,
} from '@/modules/transactions/transaction-visibility'

import {
  assertCanCreateCollectPlan,
  buildCollectPlanCreateRows,
  createCollectPlanSplits,
  type CreateCollectPlanInput,
} from './collect-plan'
import { loadExpenseCreditorUserId } from './load-expense-creditor'
import { dismissDecisionNotificationsForRequests } from './payment-request/dismiss-decision-notifications'
import type { SplitPaymentRequestRepository } from './payment-request/repository'
import type {
  SplitPaymentRecord,
  SplitRecord,
  SplitRepository,
} from './split.repository'
import {
  buildSplitDebtSummary,
  selectInstallmentSeriesSiblings,
} from './split-debt-summary.logic'
import {
  withViewerDebtPerspective,
  type SplitDebtSummaryWithViewer,
} from './viewer-debt-summary'
import { toViewerShareTotalDtos } from './viewer-share-totals'

export type PendingPaymentRequestDto = {
  id: string
  status: string
  createdAt: string
}

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
  collectLumpSum: boolean
  dueAt: string | null
  collectInstallmentNumber: number | null
  collectInstallmentsTotal: number | null
  collectPlanId: string | null
  createdAt: string
  updatedAt: string
  pendingPaymentRequest?: PendingPaymentRequestDto | null
}

export type ListSplitsResult = {
  viewerIsCreditor: boolean
  /** True when viewer is org owner or created the transaction (can add/edit/delete splits). */
  viewerCanMutate: boolean
  splits: SplitDto[]
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
  accountId: string | null
  accountType: string | null
  competenceDate: string | null
}

export type { SplitDebtSummary } from './split-debt-summary.logic'
export type { SplitDebtSummaryWithViewer } from './viewer-debt-summary'

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
    collectLumpSum: split.collectLumpSum,
    dueAt: split.dueAt?.toISOString() ?? null,
    collectInstallmentNumber: split.collectInstallmentNumber,
    collectInstallmentsTotal: split.collectInstallmentsTotal,
    collectPlanId: split.collectPlanId,
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
  collectLumpSum?: boolean
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
    private readonly transactionRepository: TransactionRepository,
    private readonly paymentRequestRepository?: SplitPaymentRequestRepository
  ) {}

  async listByTransaction(
    organizationId: string,
    transactionId: string,
    viewer?: TransactionViewer
  ): Promise<ListSplitsResult> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)

    const splits = await this.splitRepository.findByTransaction(transactionId)
    const pendingRequests =
      this.paymentRequestRepository != null
        ? await this.paymentRequestRepository.findPendingBySplitIds(splits.map(s => s.id))
        : []
    const pendingBySplitId = new Map(pendingRequests.map(r => [r.splitId, r]))

    const creditorId = viewer
      ? await loadExpenseCreditorUserId(transaction, viewer.ownerId)
      : null
    const viewerIsCreditor = Boolean(viewer && creditorId && viewer.userId === creditorId)
    const viewerCanMutate = viewer
      ? canMutateTransaction(viewer, transaction.createdBy)
      : false

    return {
      viewerIsCreditor,
      viewerCanMutate,
      splits: splits.map(split => {
        const pending = pendingBySplitId.get(split.id)
        return {
          ...toSplitDto(split),
          pendingPaymentRequest: pending
            ? {
                id: pending.id,
                status: pending.status,
                createdAt: pending.createdAt.toISOString(),
              }
            : null,
        }
      }),
    }
  }

  async create(
    organizationId: string,
    transactionId: string,
    input: CreateSplitInput,
    viewer?: TransactionViewer
  ): Promise<SplitDto> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)
    this.assertCanMutateSplits(viewer, transaction.createdBy)
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
      collectLumpSum: input.collectLumpSum,
    })

    return toSplitDto(created)
  }

  async createCollectPlan(
    organizationId: string,
    transactionId: string,
    input: CreateCollectPlanInput,
    viewer?: TransactionViewer
  ): Promise<SplitDto[]> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)
    this.assertCanMutateSplits(viewer, transaction.createdBy)
    this.validatePerson(input)
    assertCanCreateCollectPlan(transaction)

    const rows = buildCollectPlanCreateRows(transactionId, input)
    const created = await createCollectPlanSplits(this.splitRepository, rows)
    return created.map(toSplitDto)
  }

  async update(
    organizationId: string,
    transactionId: string,
    id: string,
    input: UpdateSplitInput,
    viewer?: TransactionViewer
  ): Promise<SplitDto> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)
    this.assertCanMutateSplits(viewer, transaction.createdBy)

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
      collectLumpSum: input.collectLumpSum,
    })

    if (!updated) {
      throw notFound('Split not found')
    }

    return toSplitDto(updated)
  }

  async delete(
    organizationId: string,
    transactionId: string,
    id: string,
    viewer?: TransactionViewer
  ): Promise<void> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)
    this.assertCanMutateSplits(viewer, transaction.createdBy)

    const existing = await this.splitRepository.findById(transactionId, id)
    if (!existing) {
      throw notFound('Split not found')
    }

    if (
      existing.collectPlanId &&
      existing.paidAmount === 0n &&
      existing.status === 'pending'
    ) {
      const planRows = await this.splitRepository.findByCollectPlanId(existing.collectPlanId)
      const allUnpaid = planRows.every(
        row => row.paidAmount === 0n && row.status === 'pending'
      )
      if (allUnpaid) {
        const ids = planRows.map(row => row.id)
        await this.splitRepository.deleteByCollectPlanId(existing.collectPlanId)
        await this.cancelPendingPaymentRequests(ids)
        return
      }
    }

    const deleted = await this.splitRepository.delete(id)

    if (!deleted) {
      throw notFound('Split not found')
    }

    await this.cancelPendingPaymentRequests([id])
  }

  async listPayments(
    organizationId: string,
    transactionId: string,
    splitId: string,
    viewer?: TransactionViewer
  ): Promise<SplitPaymentDto[]> {
    await this.ensureSplit(organizationId, transactionId, splitId, viewer)

    const payments = await this.splitRepository.findPayments(splitId)
    return payments.map(toPaymentDto)
  }

  async registerPayment(
    organizationId: string,
    transactionId: string,
    splitId: string,
    input: RegisterPaymentInput,
    viewer?: TransactionViewer
  ): Promise<{ payment: SplitPaymentDto; split: SplitDto }> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)
    await this.assertCanRegisterPayment(transaction, viewer)
    const split = await this.ensureSplit(organizationId, transactionId, splitId, viewer)

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

    await this.cancelPendingPaymentRequests([splitId])

    return {
      payment: toPaymentDto(result.payment),
      split: toSplitDto(result.split),
    }
  }

  async cancelPayment(
    organizationId: string,
    transactionId: string,
    splitId: string,
    paymentId: string,
    viewer?: TransactionViewer
  ): Promise<{ split: SplitDto }> {
    const transaction = await this.ensureTransaction(organizationId, transactionId, viewer)
    await this.assertCanRegisterPayment(transaction, viewer)
    await this.ensureSplit(organizationId, transactionId, splitId, viewer)

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

  async listPending(
    organizationId: string,
    userId: string,
    ownerId?: string | null
  ): Promise<PendingSplitDto[]> {
    const rows = await this.splitRepository.listPendingByOrganization(
      organizationId,
      userId,
      ownerId
    )

    return rows.map(row => ({
      ...toSplitDto(row),
      transactionTitle: row.transactionTitle,
      transactionDate: row.transactionDate.toISOString(),
      transactionAmount: centavosToString(row.transactionAmount),
      personName: row.personName,
      accountId: row.accountId,
      accountType: row.accountType,
      competenceDate: row.competenceDate?.toISOString() ?? null,
    }))
  }

  async listTransactionIdsWithSplits(
    organizationId: string,
    transactionIds: string[],
    viewer?: TransactionViewer
  ): Promise<{
    transactionIds: string[]
    fullyDelegated: Array<{
      transactionId: string
      delegateName: string
      debtorUserId: string | null
      creditorName: string
    }>
    partiallyDivided: Array<{
      transactionId: string
      splitWithName: string
      splitAmount: string
      transactionAmount: string
      debtorUserId: string | null
      creditorName: string
    }>
    splitPaidTotals: Array<{ transactionId: string; paidAmount: string }>
    splitRemainingTotals: Array<{ transactionId: string; remainingAmount: string }>
    receivableRemainingTotals: Array<{ transactionId: string; remainingAmount: string }>
    viewerShareTotals: Array<{
      transactionId: string
      amount: string
      remainingAmount: string
    }>
  }> {
    const userId = viewer?.userId
    const [
      transactionIdsWithSplits,
      fullyDelegated,
      partiallyDividedRows,
      splitPaidRows,
      splitRemainingRows,
      receivableRemainingRows,
      viewerShareRows,
    ] = await Promise.all([
      this.splitRepository.listTransactionIdsWithSplits(organizationId, transactionIds),
      this.splitRepository.listFullyDelegatedTransactions(organizationId, transactionIds),
      this.splitRepository.listPartiallyDividedTransactions(organizationId, transactionIds),
      this.splitRepository.listSplitPaidTotals(organizationId, transactionIds),
      this.splitRepository.listSplitRemainingTotals(organizationId, transactionIds),
      userId
        ? this.splitRepository.listReceivableRemainingTotals(
            organizationId,
            transactionIds,
            userId,
            viewer?.ownerId
          )
        : Promise.resolve([]),
      userId
        ? this.splitRepository.listViewerShareTotals(organizationId, transactionIds, userId)
        : Promise.resolve([]),
    ])

    const partiallyDivided = partiallyDividedRows.map(row => ({
      transactionId: row.transactionId,
      splitWithName: row.splitWithName,
      splitAmount: centavosToString(row.splitAmount) ?? '0.00',
      transactionAmount: centavosToString(row.transactionAmount) ?? '0.00',
      debtorUserId: row.debtorUserId,
      creditorName: row.creditorName,
    }))

    const mapRemaining = (rows: Array<{ transactionId: string; remainingTotal: bigint }>) =>
      rows.map(row => ({
        transactionId: row.transactionId,
        remainingAmount: centavosToString(row.remainingTotal) ?? '0.00',
      }))

    return {
      transactionIds: transactionIdsWithSplits,
      fullyDelegated,
      partiallyDivided,
      splitPaidTotals: splitPaidRows.map(row => ({
        transactionId: row.transactionId,
        paidAmount: centavosToString(row.paidTotal) ?? '0.00',
      })),
      splitRemainingTotals: mapRemaining(splitRemainingRows),
      receivableRemainingTotals: mapRemaining(receivableRemainingRows),
      viewerShareTotals: toViewerShareTotalDtos(viewerShareRows, centavosToString),
    }
  }

  async getSplitDebtSummary(
    organizationId: string,
    transactionId: string,
    viewer?: TransactionViewer
  ): Promise<SplitDebtSummaryWithViewer> {
    const anchor = await this.ensureTransaction(organizationId, transactionId, viewer)

    const siblingTransactions =
      anchor.installmentsTotal != null && anchor.installmentsTotal > 1
        ? selectInstallmentSeriesSiblings(
            await this.splitRepository.findInstallmentSiblingCandidates(
              organizationId,
              anchor
            ),
            anchor
          )
        : [anchor]

    const transactionIds = siblingTransactions.map(row => row.id)
    const splits = await this.splitRepository.findSplitsWithTransactions(transactionIds)

    const summary = buildSplitDebtSummary({
      anchorTransaction: anchor,
      siblingTransactions,
      splits,
      resolvePersonName: split =>
        split.userId ? (split.userName ?? 'Membro') : (split.contactName ?? 'Contato'),
    })

    const creditorId = viewer
      ? await loadExpenseCreditorUserId(anchor, viewer.ownerId)
      : null
    const viewerIsCreditor = Boolean(
      !viewer || (creditorId != null && viewer.userId === creditorId)
    )

    return withViewerDebtPerspective(summary, {
      viewerUserId: viewer?.userId,
      viewerIsCreditor,
    })
  }

  private async cancelPendingPaymentRequests(splitIds: string[]): Promise<void> {
    const paymentRequestRepository = this.paymentRequestRepository
    if (!paymentRequestRepository || splitIds.length === 0) return

    const cancelledIds = (
      await Promise.all(
        splitIds.map(splitId => paymentRequestRepository.cancelPendingBySplitId(splitId))
      )
    ).flat()

    await dismissDecisionNotificationsForRequests(cancelledIds)
  }

  private validatePerson(input: { userId?: string | null; contactName?: string | null }): void {
    if (!input.userId && !input.contactName) {
      throw badRequest('Either userId or contactName is required')
    }
  }

  private assertCanMutateSplits(
    viewer: TransactionViewer | undefined,
    createdBy: string | null | undefined
  ) {
    if (!viewer) return
    if (!canMutateTransaction(viewer, createdBy)) {
      throw forbidden('You can only manage splits on transactions you created')
    }
  }

  private async assertCanRegisterPayment(
    transaction: { cardId: string | null; accountId: string | null; createdBy: string | null },
    viewer?: TransactionViewer
  ) {
    if (!viewer) return

    const creditorId = await loadExpenseCreditorUserId(transaction, viewer.ownerId)
    if (!creditorId || viewer.userId !== creditorId) {
      throw forbidden('Only the expense creditor can register or cancel split payments')
    }
  }

  private async ensureTransaction(
    organizationId: string,
    transactionId: string,
    viewer?: TransactionViewer
  ) {
    const transaction = await this.transactionRepository.findById(
      organizationId,
      transactionId,
      viewer
    )

    if (!transaction) {
      throw notFound('Transaction not found')
    }

    return transaction
  }

  private async ensureSplit(
    organizationId: string,
    transactionId: string,
    splitId: string,
    viewer?: TransactionViewer
  ) {
    await this.ensureTransaction(organizationId, transactionId, viewer)

    const split = await this.splitRepository.findById(transactionId, splitId)

    if (!split) {
      throw notFound('Split not found')
    }

    return split
  }
}
