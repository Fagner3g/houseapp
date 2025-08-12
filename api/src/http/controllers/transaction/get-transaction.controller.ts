import type { FastifyReply, FastifyRequest } from 'fastify'

import { getTransaction } from '@/domain/transactions/get-transaction'
import type { GetTransactionSchemaParams } from '@/http/schemas/transaction/get-transactions.schema'

type Req = FastifyRequest<{ Params: GetTransactionSchemaParams }>

export async function getTransactionController(request: Req, reply: FastifyReply) {
  const { id } = request.params
  request.organization.id

  const { transaction } = await getTransaction({ id })

  return reply.status(200).send({ transaction })
}
