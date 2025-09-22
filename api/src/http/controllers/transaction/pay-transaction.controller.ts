import type { FastifyReply, FastifyRequest } from 'fastify'

import { payTransactionService } from '@/domain/transactions/pay-transaction'
import type {
  PayTransactionSchemaBody,
  PayTransactionSchemaParams,
} from '@/http/schemas/transaction/pay-transaction.schema'

export async function payTransactionController(
  request: FastifyRequest<{
    Params: PayTransactionSchemaParams
    Body: PayTransactionSchemaBody
  }>,
  reply: FastifyReply
) {
  const { id } = request.params
  const body = request.body || {}
  const { paidAt } = body
  await payTransactionService({ id, paidAt: paidAt ? new Date(paidAt) : undefined })
  return reply.status(204).send()
}
