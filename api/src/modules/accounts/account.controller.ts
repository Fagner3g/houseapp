import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import { toTransactionViewer } from '@/modules/transactions/transaction-visibility'
import type { CreateAccountBody, ListAccountsQuery, UpdateAccountBody } from './account.schema'

type OrgParams = { slug: string }
type AccountParams = OrgParams & { id: string }

function viewerFromRequest(request: FastifyRequest) {
  return toTransactionViewer(request.user.sub, request.organization.ownerId)
}

export async function listAccountsController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ListAccountsQuery }>,
  reply: FastifyReply
) {
  const accounts = await container.accountService.list(
    request.organization.id,
    viewerFromRequest(request),
    { ownedOnly: request.query.ownedOnly }
  )
  return reply.send({ accounts })
}

export async function getAccountController(
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply
) {
  const account = await container.accountService.get(
    request.organization.id,
    request.params.id,
    viewerFromRequest(request)
  )
  return reply.send({ account })
}

export async function createAccountController(
  request: FastifyRequest<{ Params: OrgParams; Body: CreateAccountBody }>,
  reply: FastifyReply
) {
  const account = await container.accountService.create({
    organizationId: request.organization.id,
    ...request.body,
    createdBy: request.user.sub,
  })

  return reply.status(StatusCodes.CREATED).send({ account })
}

export async function updateAccountController(
  request: FastifyRequest<{ Params: AccountParams; Body: UpdateAccountBody }>,
  reply: FastifyReply
) {
  const account = await container.accountService.update(
    request.organization.id,
    request.params.id,
    request.body
  )

  return reply.send({ account })
}

export async function deleteAccountController(
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply
) {
  await container.accountService.delete(request.organization.id, request.params.id)
  return reply.status(StatusCodes.NO_CONTENT).send()
}
