import type { FastifyReply, FastifyRequest } from 'fastify'

import { createTransaction } from '@/domain/transactions/create-transaction'
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
  } = request.body

  const ownerId = request.user.sub

  const user = await userService.getUser({ email: payToEmail })

  if (!user) {
    throw new BadRequestError('User not found')
  }

  await new Promise(resolve => setTimeout(resolve, 10000))

  const { transaction } = await createTransaction({
    type,
    title,
    ownerId,
    payToId: user.id,
    organizationId,
    amount,
    dueDate: new Date(dueDate),
    description,
    isRecurring,
    recurrenceSelector,
    recurrenceType,
    recurrenceInterval,
    recurrenceUntil,
  })

  return reply.status(201).send({ transaction })
}
