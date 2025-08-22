import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateTransactionService } from '@/domain/transactions/update-transaction'
import type {
  UpdateTransactionSchemaBody,
  UpdateTransactionSchemaParams,
} from '@/http/schemas/transaction/update-transaction.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/http/utils/logger'

type Req = FastifyRequest<{
  Params: UpdateTransactionSchemaParams
  Body: UpdateTransactionSchemaBody
}>

export async function updateTransactionController(request: Req, reply: FastifyReply) {
  const organizationId = request.organization.id
  const { type, title, amount, dueDate, description, tags, serieId, updateSeries } = request.body
  const { id: occurrenceId } = request.params

  const ownerId = request.user.sub

  try {
    await updateTransactionService({
      occurrenceId,
      serieId,
      updateSeries,
      type,
      title,
      ownerId,
      organizationId,
      amount,
      dueDate,
      description,
      tags,
      updateSerie: true,
    })

    return reply.status(204).send(null)
  } catch (error) {
    logger.error(error)
    throw new BadRequestError('Erro ao atualizar transação')
  }
}
