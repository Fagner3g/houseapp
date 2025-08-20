import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateTransactionService } from '@/domain/transactions/update-transaction'
import { userService } from '@/domain/user'
import type {
  UpdateTransactionSchemaBody,
  UpdateTransactionSchemaParams,
} from '@/http/schemas/transaction/update-transaction.schema'
import { BadRequestError } from '@/http/utils/error'

type Req = FastifyRequest<{
  Params: UpdateTransactionSchemaParams
  Body: UpdateTransactionSchemaBody
}>

export async function updateTransactionController(request: Req, reply: FastifyReply) {
  const organizationId = request.organization.id
  const {
    type,
    title,
    payToEmail,
    amount,
    dueDate,
    description,
    isRecurring,
    recurrenceSelector,
    recurrenceType,
    recurrenceInterval,
    recurrenceUntil,
    recurrenceStart,
    installmentsTotal,
    installmentsPaid,
  } = request.body
  const { id } = request.params

  const ownerId = request.user.sub

  const user = await userService.getUser({ email: payToEmail })
  if (!user) {
    throw new BadRequestError('User not found')
  }

  await updateTransactionService({
    id,
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
    recurrenceStart,
    installmentsTotal,
    installmentsPaid,
  })

  return reply.status(204).send(null)
}
