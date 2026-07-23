import { eq } from 'drizzle-orm'

import { badRequest, forbidden, notFound } from '@/core/errors'
import { centavosToString } from '@/core/money'
import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'
import type { NotificationRepository } from '@/modules/alerts/notification.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import type { TransactionViewer } from '@/modules/transactions/transaction-visibility'

import { loadExpenseCreditorUserId } from '../load-expense-creditor'
import type { SplitRepository } from '../split.repository'
import type { SplitPaymentDto, SplitDto, SplitService } from '../split.service'
import {
  dismissDecisionNotificationsForRequests,
} from './dismiss-decision-notifications'
import { loadUserName, notifySplitPaymentRequest, notifySplitPaymentRequestResolved } from './notify'
import type {
  SplitPaymentRequestRecord,
  SplitPaymentRequestRepository,
} from './repository'

export type SplitPaymentRequestDto = {
  id: string
  organizationId: string
  transactionId: string
  splitId: string
  requestedByUserId: string
  recipientUserId: string
  amount: string
  note: string | null
  status: string
  createdAt: string
  respondedAt: string | null
  transactionTitle?: string
  requesterName?: string
}

function toDto(
  row: SplitPaymentRequestRecord,
  extras?: { transactionTitle?: string; requesterName?: string }
): SplitPaymentRequestDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    transactionId: row.transactionId,
    splitId: row.splitId,
    requestedByUserId: row.requestedByUserId,
    recipientUserId: row.recipientUserId,
    amount: centavosToString(row.amount) ?? '0.00',
    note: row.note,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    ...extras,
  }
}

export class SplitPaymentRequestService {
  constructor(
    private readonly requestRepository: SplitPaymentRequestRepository,
    private readonly splitRepository: SplitRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly splitService: SplitService,
    private readonly notificationRepository: NotificationRepository
  ) {}

  async create(
    organizationId: string,
    transactionId: string,
    splitId: string,
    input: { note?: string | null },
    viewer: TransactionViewer
  ): Promise<SplitPaymentRequestDto> {
    const transaction = await this.transactionRepository.findById(
      organizationId,
      transactionId,
      viewer
    )
    if (!transaction) throw notFound('Transaction not found')

    const split = await this.splitRepository.findById(transactionId, splitId)
    if (!split) throw notFound('Split not found')

    if (split.status === 'forgiven' || split.status === 'paid') {
      throw badRequest('Cannot request payment confirmation on a settled split')
    }

    const creditorId = await loadExpenseCreditorUserId(transaction, viewer.ownerId)
    if (!creditorId) {
      throw badRequest('Could not resolve expense creditor')
    }

    if (viewer.userId === creditorId) {
      throw badRequest('Creditor can register payment directly')
    }

    const existing = await this.requestRepository.findPendingBySplitId(splitId)
    if (existing) {
      throw badRequest('A payment confirmation request is already pending')
    }

    const remaining = split.amount - split.paidAmount
    if (remaining <= 0n) {
      throw badRequest('Split has no remaining amount')
    }

    const created = await this.requestRepository.create({
      organizationId,
      transactionId,
      splitId,
      requestedByUserId: viewer.userId,
      recipientUserId: creditorId,
      amount: remaining,
      note: input.note,
    })

    const [requesterName, organizationName] = await Promise.all([
      loadUserName(viewer.userId),
      loadOrganizationName(organizationId),
    ])

    await notifySplitPaymentRequest({
      notificationRepository: this.notificationRepository,
      request: created,
      requesterName,
      transactionTitle: transaction.title,
      organizationName,
    })

    return toDto(created, { requesterName, transactionTitle: transaction.title })
  }

  async listPendingForRecipient(
    organizationId: string,
    viewer: TransactionViewer
  ): Promise<SplitPaymentRequestDto[]> {
    const rows = await this.requestRepository.listPendingByRecipient(
      organizationId,
      viewer.userId
    )

    return Promise.all(
      rows.map(async row => {
        const [requesterName, transaction] = await Promise.all([
          loadUserName(row.requestedByUserId),
          this.transactionRepository.findById(organizationId, row.transactionId, viewer),
        ])
        return toDto(row, {
          requesterName,
          transactionTitle: transaction?.title,
        })
      })
    )
  }

  async accept(
    organizationId: string,
    requestId: string,
    viewer: TransactionViewer
  ): Promise<{
    request: SplitPaymentRequestDto
    payment: SplitPaymentDto
    split: SplitDto
  }> {
    const request = await this.requireRecipientPending(organizationId, requestId, viewer)

    // Accept before registerPayment so cancelPendingBySplitId does not race this row.
    const updated = await this.requestRepository.updateStatus(request.id, 'accepted')
    if (!updated) throw notFound('Payment request not found')

    await dismissDecisionNotificationsForRequests([request.id])

    try {
      const result = await this.splitService.registerPayment(
        organizationId,
        request.transactionId,
        request.splitId,
        { amount: centavosToString(request.amount) ?? '0.00' },
        viewer
      )

      await this.notifyRequester(request, 'accepted', viewer)

      return { request: toDto(updated), payment: result.payment, split: result.split }
    } catch (error) {
      await this.requestRepository.reopen(request.id)
      throw error
    }
  }

  async reject(
    organizationId: string,
    requestId: string,
    viewer: TransactionViewer
  ): Promise<SplitPaymentRequestDto> {
    const request = await this.requireRecipientPending(organizationId, requestId, viewer)

    const updated = await this.requestRepository.updateStatus(requestId, 'rejected')
    if (!updated) throw notFound('Payment request not found')

    await dismissDecisionNotificationsForRequests([requestId])
    await this.notifyRequester(request, 'rejected', viewer)

    return toDto(updated)
  }

  private async notifyRequester(
    request: SplitPaymentRequestRecord,
    decision: 'accepted' | 'rejected',
    viewer: TransactionViewer
  ): Promise<void> {
    const [creditorName, organizationName, transaction] = await Promise.all([
      loadUserName(viewer.userId),
      loadOrganizationName(request.organizationId),
      this.transactionRepository.findById(request.organizationId, request.transactionId, viewer),
    ])

    await notifySplitPaymentRequestResolved({
      notificationRepository: this.notificationRepository,
      request,
      decision,
      creditorName,
      transactionTitle: transaction?.title ?? 'transação',
      organizationName,
    })
  }

  private async requireRecipientPending(
    organizationId: string,
    requestId: string,
    viewer: TransactionViewer
  ): Promise<SplitPaymentRequestRecord> {
    const request = await this.requestRepository.findById(requestId)
    if (!request || request.organizationId !== organizationId) {
      throw notFound('Payment request not found')
    }
    if (request.recipientUserId !== viewer.userId) {
      throw forbidden('Only the expense creditor can respond to this request')
    }
    if (request.status !== 'pending') {
      throw badRequest('Payment request is no longer pending')
    }
    return request
  }
}

async function loadOrganizationName(organizationId: string): Promise<string> {
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  return org?.name?.trim() || 'Organização'
}
