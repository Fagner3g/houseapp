import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'
import type { CreateRecurringBody, UpdateRecurringBody } from './recurring.schema'

type OrgParams = { slug: string }
type RecurringParams = OrgParams & { id: string }

export async function listRecurringController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const recurringTransactions = await container.recurringService.list(request.organization.id)
  return reply.send({ recurringTransactions })
}

export async function getRecurringController(
  request: FastifyRequest<{ Params: RecurringParams }>,
  reply: FastifyReply
) {
  const recurringTransaction = await container.recurringService.get(
    request.organization.id,
    request.params.id
  )

  return reply.send({ recurringTransaction })
}

export async function createRecurringController(
  request: FastifyRequest<{ Params: OrgParams; Body: CreateRecurringBody }>,
  reply: FastifyReply
) {
  const recurringTransaction = await container.recurringService.create(
    request.organization.id,
    request.body
  )

  return reply.status(StatusCodes.CREATED).send({ recurringTransaction })
}

export async function updateRecurringController(
  request: FastifyRequest<{ Params: RecurringParams; Body: UpdateRecurringBody }>,
  reply: FastifyReply
) {
  const recurringTransaction = await container.recurringService.update(
    request.organization.id,
    request.params.id,
    request.body
  )

  return reply.send({ recurringTransaction })
}

export async function deleteRecurringController(
  request: FastifyRequest<{ Params: RecurringParams }>,
  reply: FastifyReply
) {
  await container.recurringService.delete(request.organization.id, request.params.id)
  return reply.status(StatusCodes.NO_CONTENT).send()
}
