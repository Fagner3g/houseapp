import type { FastifyReply, FastifyRequest } from 'fastify'

import { listTransactionsService } from '@/domain/transactions/list-transactions'
import type {
  ListTransactionSchemaParams,
  ListTransactionSchemaQuery,
} from '@/http/schemas/transaction/list-transactions.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

type Req = FastifyRequest<{
  Params: ListTransactionSchemaParams
  Querystring: ListTransactionSchemaQuery
}>

export async function listTransactionsController(request: Req, reply: FastifyReply) {
  const userId = request.user.sub
  const orgId = request.organization.id

  const {
    tags,
    tagFilterMode,
    type,
    dateFrom,
    dateTo,
    page,
    perPage,
    responsibleUserId,
    payToId,
    onlyMarked,
  } = request.query

  try {
    const payload = await listTransactionsService({
      userId,
      orgId,
      tags,
      tagFilterMode,
      type,
      dateFrom,
      dateTo,
      page,
      perPage,
      responsibleUserId,
      payToId,
      onlyMarked,
    })

    return reply.status(200).send(payload)
  } catch (error) {
    logger.error(error)
    throw new BadRequestError('Erro ao buscar transações')
  }
}
