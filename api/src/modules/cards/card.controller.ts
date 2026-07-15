import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import { toTransactionViewer } from '@/modules/transactions/transaction-visibility'
import type {
  BlockCardBody,
  CancelCardBody,
  CreateCardBody,
  UpdateCardBody,
} from './card.schema'

type OrgParams = { slug: string }
type AccountParams = OrgParams & { accountId: string }
type CardParams = AccountParams & { id: string }

function viewerFromRequest(request: FastifyRequest) {
  return toTransactionViewer(request.user.sub, request.organization.ownerId)
}

export async function listCardsController(
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply
) {
  const cards = await container.cardService.list(
    request.organization.id,
    request.params.accountId,
    viewerFromRequest(request)
  )

  return reply.send({ cards })
}

export async function getCardController(
  request: FastifyRequest<{ Params: CardParams }>,
  reply: FastifyReply
) {
  const card = await container.cardService.get(
    request.organization.id,
    request.params.accountId,
    request.params.id,
    viewerFromRequest(request)
  )

  return reply.send({ card })
}

export async function createCardController(
  request: FastifyRequest<{ Params: AccountParams; Body: CreateCardBody }>,
  reply: FastifyReply
) {
  const viewer = viewerFromRequest(request)
  const card = await container.cardService.create(
    request.organization.id,
    request.params.accountId,
    {
      ...request.body,
      // Members can only create cards assigned to themselves.
      userId: viewer.isOwner ? request.body.userId : viewer.userId,
    }
  )

  return reply.status(StatusCodes.CREATED).send({ card })
}

export async function updateCardController(
  request: FastifyRequest<{ Params: CardParams; Body: UpdateCardBody }>,
  reply: FastifyReply
) {
  const card = await container.cardService.update(
    request.organization.id,
    request.params.accountId,
    request.params.id,
    request.body
  )

  return reply.send({ card })
}

export async function deleteCardController(
  request: FastifyRequest<{ Params: CardParams; Body?: CancelCardBody }>,
  reply: FastifyReply
) {
  await container.cardService.cancel(
    request.organization.id,
    request.params.accountId,
    request.params.id,
    request.body?.reason
  )

  return reply.status(StatusCodes.NO_CONTENT).send()
}

export async function blockCardController(
  request: FastifyRequest<{ Params: CardParams; Body: BlockCardBody }>,
  reply: FastifyReply
) {
  const card = await container.cardService.block(
    request.organization.id,
    request.params.accountId,
    request.params.id,
    request.body.reason
  )

  return reply.send({ card })
}

export async function unblockCardController(
  request: FastifyRequest<{ Params: CardParams }>,
  reply: FastifyReply
) {
  const card = await container.cardService.unblock(
    request.organization.id,
    request.params.accountId,
    request.params.id
  )

  return reply.send({ card })
}
