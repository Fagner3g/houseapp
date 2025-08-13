import type { FastifyReply, FastifyRequest } from 'fastify'

import { listTransactionsService } from '@/domain/transactions/list-transactions'
import type {
  ListTransactionSchemaParams,
  ListTransactionSchemaQuery,
} from '@/http/schemas/transaction/list-transactions.schema'

type Req = FastifyRequest<{
  Params: ListTransactionSchemaParams
  Querystring: ListTransactionSchemaQuery
}>

export async function listTransactionsController(request: Req, reply: FastifyReply) {
  const userId = request.user.sub
  const orgId = request.organization.id

  const { type, dateFrom, dateTo, page, perPage } = request.query

  const result = await listTransactionsService({
    userId,
    orgId,
    type,
    dateFrom,
    dateTo,
    page,
    perPage,
  })

  return reply.status(200).send(result)
}
