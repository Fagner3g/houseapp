import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import { toTransactionViewer } from '@/modules/transactions/transaction-visibility'
import type {
  CreateCollectPlanBody,
  CreateSplitBody,
  ListSplitTransactionIdsBody,
  RegisterPaymentBody,
  UpdateSplitBody,
} from './split.schema'

type OrgParams = { slug: string }
type TransactionParams = OrgParams & { transactionId: string }
type SplitParams = TransactionParams & { id: string }
type SplitPaymentParams = SplitParams & { paymentId: string }

function viewerFromRequest(request: FastifyRequest) {
  return toTransactionViewer(request.user.sub, request.organization.ownerId)
}

export async function listSplitsController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const result = await container.splitService.listByTransaction(
    request.organization.id,
    request.params.transactionId,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function createSplitController(
  request: FastifyRequest<{ Params: TransactionParams; Body: CreateSplitBody }>,
  reply: FastifyReply
) {
  const split = await container.splitService.create(
    request.organization.id,
    request.params.transactionId,
    request.body,
    viewerFromRequest(request)
  )

  return reply.status(StatusCodes.CREATED).send({ split })
}

export async function createCollectPlanController(
  request: FastifyRequest<{ Params: TransactionParams; Body: CreateCollectPlanBody }>,
  reply: FastifyReply
) {
  const splits = await container.splitService.createCollectPlan(
    request.organization.id,
    request.params.transactionId,
    request.body,
    viewerFromRequest(request)
  )

  return reply.status(StatusCodes.CREATED).send({ splits })
}

export async function updateSplitController(
  request: FastifyRequest<{ Params: SplitParams; Body: UpdateSplitBody }>,
  reply: FastifyReply
) {
  const split = await container.splitService.update(
    request.organization.id,
    request.params.transactionId,
    request.params.id,
    request.body,
    viewerFromRequest(request)
  )

  return reply.send({ split })
}

export async function deleteSplitController(
  request: FastifyRequest<{ Params: SplitParams }>,
  reply: FastifyReply
) {
  await container.splitService.delete(
    request.organization.id,
    request.params.transactionId,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.status(StatusCodes.NO_CONTENT).send()
}

export async function listSplitPaymentsController(
  request: FastifyRequest<{ Params: SplitParams }>,
  reply: FastifyReply
) {
  const payments = await container.splitService.listPayments(
    request.organization.id,
    request.params.transactionId,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.send({ payments })
}

export async function registerSplitPaymentController(
  request: FastifyRequest<{ Params: SplitParams; Body: RegisterPaymentBody }>,
  reply: FastifyReply
) {
  const result = await container.splitService.registerPayment(
    request.organization.id,
    request.params.transactionId,
    request.params.id,
    request.body,
    viewerFromRequest(request)
  )

  return reply.status(StatusCodes.CREATED).send(result)
}

export async function cancelSplitPaymentController(
  request: FastifyRequest<{ Params: SplitPaymentParams }>,
  reply: FastifyReply
) {
  const result = await container.splitService.cancelPayment(
    request.organization.id,
    request.params.transactionId,
    request.params.id,
    request.params.paymentId,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function listPendingSplitsController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const viewer = viewerFromRequest(request)
  const splits = await container.splitService.listPending(
    request.organization.id,
    request.user.sub,
    viewer.ownerId
  )
  return reply.send({ splits })
}

export async function listSplitTransactionIdsController(
  request: FastifyRequest<{ Params: OrgParams; Body: ListSplitTransactionIdsBody }>,
  reply: FastifyReply
) {
  const result = await container.splitService.listTransactionIdsWithSplits(
    request.organization.id,
    request.body.transactionIds,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function getSplitDebtSummaryController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const summary = await container.splitService.getSplitDebtSummary(
    request.organization.id,
    request.params.transactionId,
    viewerFromRequest(request)
  )

  return reply.send(summary)
}
