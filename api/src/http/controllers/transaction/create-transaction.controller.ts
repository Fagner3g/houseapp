import type { FastifyReply, FastifyRequest } from 'fastify'

import { createTransactionService } from '@/domain/transactions/create-transaction'
import { userService } from '@/domain/user'
import type {
  CreateTransactionsSchemaBody,
  CreateTransactionsSchemaParams,
} from '@/http/schemas/transaction/create-transaction.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/http/utils/logger'

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
    recurrenceStart,
    installmentsTotal,
    installmentsPaid,
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

  try {
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
      recurrenceStart,
      installmentsTotal,
      installmentsPaid,
    })
    logger.debug('Transaction created successfully')
  } catch (error) {
    logger.error(error)
    throw new BadRequestError('Error creating transaction')
  }

  return reply.status(201).send(null)
}
