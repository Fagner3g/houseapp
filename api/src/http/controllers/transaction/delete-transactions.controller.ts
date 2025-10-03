import type { FastifyReply, FastifyRequest } from 'fastify'

import { deleteTransactionsService } from '@/domain/transactions/delete-transactions'
import type {
  DeleteTransactionsSchemaBody,
  DeleteTransactionsSchemaParams,
} from '@/http/schemas/transaction/delete-transactions.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

type Req = FastifyRequest<{
  Params: DeleteTransactionsSchemaParams
  Body: DeleteTransactionsSchemaBody
}>

export async function deleteTransactionsController(request: Req, reply: FastifyReply) {
  const ownerId = request.user.sub
  const organizationId = request.organization.id
  const { ids } = request.body

  try {
    await deleteTransactionsService({ ids, ownerId, organizationId })

    return reply.status(200).send()
  } catch (error) {
    logger.error({ error }, 'Erro ao deletar transações')
    throw new BadRequestError('Erro ao deletar transações')
  }
}
