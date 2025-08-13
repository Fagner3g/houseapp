import type { FastifyReply, FastifyRequest } from 'fastify'

import { createTransactionService } from '@/domain/transactions/create-transaction'
import { userService } from '@/domain/user'
import type {
  CreateTransactionsSchemaBody,
  CreateTransactionsSchemaParams,
} from '@/http/schemas/transaction/create-transaction.schema'
import { BadRequestError } from '@/http/utils/error'

type Req = FastifyRequest<{
  Params: CreateTransactionsSchemaParams
  Body: CreateTransactionsSchemaBody
}>

export async function createTransactionController(request: Req, reply: FastifyReply) {
  const organizationId = request.organization.id
  const {
    type,
    isRecurring,
    recurrenceSelector,
    recurrenceType,
    recurrenceInterval,
    recurrenceUntil,
    title,
    payToEmail,
    amount,
    dueDate,
    description,
    tags,
  } = request.body

  const ownerId = request.user.sub

  const user = await userService.getUser({ email: payToEmail })

  if (!user) {
    throw new BadRequestError('User not found')
  }

  await createTransactionService({
    type,
    title,
    ownerId,
    payToId: user.id,
    organizationId,
    amount,
    dueDate: new Date(dueDate),
    description,
    tags,
    isRecurring,
    recurrenceSelector,
    recurrenceType,
    recurrenceInterval,
    recurrenceUntil,
  })

  return reply.status(201).send(null)
}
