import type { FastifyReply, FastifyRequest } from 'fastify'

import { listTransactionsService } from '@/domain/transactions/list-transactions'
import type { ListTransactionSchemaParams } from '@/http/schemas/transaction/list-transactions.schema'

type Req = FastifyRequest<{ Params: ListTransactionSchemaParams }>

export async function listTransactionsController(request: Req, reply: FastifyReply) {
  const userId = request.user.sub
  const orgId = request.organization.id

  const { transactions } = await listTransactionsService({ userId, orgId })

  return reply.status(200).send({ transactions })
}
