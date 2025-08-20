import type { FastifyReply, FastifyRequest } from 'fastify'

import { runReports } from '@/domain/reports/transactions'
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

  const { tags, tagFilterMode, type, dateFrom, dateTo, page, perPage } = request.query

  const {
    transactions,
    page: currentPage,
    perPage: currentPerPage,
    totalItems,
    totalPages,
    pagesRemaining,
  } = await listTransactionsService({
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

  const report = await runReports(userId)
  console.log(report)

  return reply.status(200).send({
    transactions,
    page: currentPage,
    perPage: currentPerPage,
    totalItems,
    totalPages,
    pagesRemaining,
  })
}
