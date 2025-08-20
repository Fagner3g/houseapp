import type { FastifyReply, FastifyRequest } from 'fastify'

import { payTransactionService } from '@/domain/transactions/pay-transaction'

interface Params {
  id: string
  slug: string
}

export async function payTransactionController(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
) {
  const { id } = request.params
  await payTransactionService({ id })
  return reply.status(204).send()
}
