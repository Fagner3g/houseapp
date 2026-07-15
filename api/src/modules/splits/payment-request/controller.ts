import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import { toTransactionViewer } from '@/modules/transactions/transaction-visibility'

import type { CreateSplitPaymentRequestBody } from './schema'

type OrgParams = { slug: string }
type SplitParams = OrgParams & { transactionId: string; id: string }
type RequestParams = OrgParams & { requestId: string }

function viewerFromRequest(request: FastifyRequest) {
  return toTransactionViewer(request.user.sub, request.organization.ownerId)
}

export async function createSplitPaymentRequestController(
  request: FastifyRequest<{ Params: SplitParams; Body: CreateSplitPaymentRequestBody }>,
  reply: FastifyReply
) {
  const result = await container.splitPaymentRequestService.create(
    request.organization.id,
    request.params.transactionId,
    request.params.id,
    request.body,
    viewerFromRequest(request)
  )

  return reply.status(StatusCodes.CREATED).send({ request: result })
}

export async function listSplitPaymentRequestsController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const requests = await container.splitPaymentRequestService.listPendingForRecipient(
    request.organization.id,
    viewerFromRequest(request)
  )

  return reply.send({ requests })
}

export async function acceptSplitPaymentRequestController(
  request: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) {
  const result = await container.splitPaymentRequestService.accept(
    request.organization.id,
    request.params.requestId,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function rejectSplitPaymentRequestController(
  request: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) {
  const result = await container.splitPaymentRequestService.reject(
    request.organization.id,
    request.params.requestId,
    viewerFromRequest(request)
  )

  return reply.send({ request: result })
}
