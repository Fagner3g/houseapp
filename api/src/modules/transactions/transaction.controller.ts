import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import { createTransfer } from '@/modules/transactions/transfer'
import type { CreateTransferBody } from '@/modules/transactions/transfer'
import { toTransactionViewer } from './transaction-visibility'
import type {
  BulkNotifyTargetBody,
  BulkReviewImportBody,
  CreateTransactionBody,
  ListTransactionsQuery,
  PayTransactionBody,
  SchedulePaymentBody,
  UpdateTransactionBody,
} from './transaction.schema'

type OrgParams = { slug: string }
type TransactionParams = OrgParams & { id: string }

function viewerFromRequest(request: FastifyRequest) {
  return toTransactionViewer(request.user.sub, request.organization.ownerId)
}

export async function listTransactionsController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ListTransactionsQuery }>,
  reply: FastifyReply
) {
  const result = await container.transactionService.list(request.organization.id, {
    accountId: request.query.accountId,
    categoryId: request.query.categoryId,
    status: request.query.status,
    type: request.query.type,
    dateFrom: request.query.dateFrom ? new Date(request.query.dateFrom) : undefined,
    dateTo: request.query.dateTo ? new Date(request.query.dateTo) : undefined,
    search: request.query.search,
    page: request.query.page,
    perPage: request.query.perPage,
    payableOnly: request.query.payableOnly,
    scheduledOnly: request.query.scheduledOnly,
    ownedOnly: request.query.ownedOnly,
    viewer: viewerFromRequest(request),
  })

  return reply.send(result)
}

export async function getTransactionController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const transaction = await container.transactionService.get(
    request.organization.id,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.send({ transaction })
}

export async function getInstallmentSeriesController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const result = await container.transactionService.getInstallmentSeries(
    request.organization.id,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function createTransactionController(
  request: FastifyRequest<{ Params: OrgParams; Body: CreateTransactionBody }>,
  reply: FastifyReply
) {
  const result = await container.transactionService.create(
    request.organization.id,
    request.body,
    request.user.sub
  )

  return reply.status(StatusCodes.CREATED).send(result)
}

export async function createTransferController(
  request: FastifyRequest<{ Params: OrgParams; Body: CreateTransferBody }>,
  reply: FastifyReply
) {
  const result = await createTransfer({
    userId: request.user.sub,
    fromOrganizationId: request.organization.id,
    input: request.body,
    transactionRepository: container.transactionRepository,
    accountRepository: container.accountRepository,
  })

  return reply.status(StatusCodes.CREATED).send(result)
}

export async function bulkCreateTransactionsController(
  request: FastifyRequest<{ Params: OrgParams; Body: { transactions: CreateTransactionBody[] } }>,
  reply: FastifyReply
) {
  const transactions = await container.transactionService.bulkCreate(
    request.organization.id,
    request.body.transactions,
    request.user.sub
  )

  return reply.status(StatusCodes.CREATED).send({ transactions })
}

export async function updateTransactionController(
  request: FastifyRequest<{ Params: TransactionParams; Body: UpdateTransactionBody }>,
  reply: FastifyReply
) {
  const transaction = await container.transactionService.update(
    request.organization.id,
    request.params.id,
    request.body,
    viewerFromRequest(request)
  )

  return reply.send({ transaction })
}

export async function payTransactionController(
  request: FastifyRequest<{ Params: TransactionParams; Body: PayTransactionBody }>,
  reply: FastifyReply
) {
  const transaction = await container.transactionService.pay(
    request.organization.id,
    request.params.id,
    request.body,
    viewerFromRequest(request)
  )

  return reply.send({ transaction })
}

export async function cancelTransactionPaymentController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const transaction = await container.transactionService.cancelPayment(
    request.organization.id,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.send({ transaction })
}

export async function scheduleTransactionPaymentController(
  request: FastifyRequest<{ Params: TransactionParams; Body: SchedulePaymentBody }>,
  reply: FastifyReply
) {
  const transaction = await container.transactionService.schedulePayment(
    request.organization.id,
    request.params.id,
    request.body,
    viewerFromRequest(request)
  )

  return reply.send({ transaction })
}

export async function cancelScheduledTransactionPaymentController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const transaction = await container.transactionService.cancelScheduledPayment(
    request.organization.id,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.send({ transaction })
}

export async function deleteTransactionController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  await container.transactionService.delete(
    request.organization.id,
    request.params.id,
    viewerFromRequest(request)
  )
  return reply.status(StatusCodes.NO_CONTENT).send()
}

export async function bulkNotifyTargetController(
  request: FastifyRequest<{ Params: OrgParams; Body: { updates: BulkNotifyTargetBody[] } }>,
  reply: FastifyReply
) {
  const transactions = await container.transactionService.bulkNotifyTarget(
    request.organization.id,
    request.body.updates
  )

  return reply.send({ transactions })
}

export async function bulkReviewImportController(
  request: FastifyRequest<{ Params: OrgParams; Body: { updates: BulkReviewImportBody[] } }>,
  reply: FastifyReply
) {
  const result = await container.transactionService.bulkReviewImport(
    request.organization.id,
    request.body.updates
  )

  return reply.send(result)
}
