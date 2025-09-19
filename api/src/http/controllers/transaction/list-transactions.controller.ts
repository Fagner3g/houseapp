import type { FastifyReply, FastifyRequest } from 'fastify'

import { listTransactionsService } from '@/domain/transactions/list-transactions'
import type {
  ListTransactionSchemaParams,
  ListTransactionSchemaQuery,
} from '@/http/schemas/transaction/list-transactions.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/http/utils/logger'
import { runAllOwnersNow } from '@/jobs/transactions'
import { runOwnerDigestNow } from '@/jobs/transactions-to-owner'

type Req = FastifyRequest<{
  Params: ListTransactionSchemaParams
  Querystring: ListTransactionSchemaQuery
}>

export async function listTransactionsController(request: Req, reply: FastifyReply) {
  const userId = request.user.sub
  const orgId = request.organization.id

  const { tags, tagFilterMode, type, dateFrom, dateTo, page, perPage } = request.query

  //runAllOwnersNow()
  //runOwnerDigestNow()
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
    })

    return reply.status(200).send(payload)
  } catch (error) {
    logger.error(error)
    throw new BadRequestError('Erro ao buscar transações')
  }
}
