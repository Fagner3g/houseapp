import type { FastifyReply, FastifyRequest } from 'fastify'

import { getTransactionInstallments } from '@/domain/transactions/get-transaction-installments'
import type { GetTransactionInstallmentsSchemaParams } from '@/http/schemas/transaction/get-transaction-installments.schema'

type Req = FastifyRequest<{ Params: GetTransactionInstallmentsSchemaParams }>

export async function getTransactionInstallmentsController(request: Req, reply: FastifyReply) {
  const { serieId } = request.params
  // request.organization.id - para verificação de acesso se necessário

  const { installments } = await getTransactionInstallments({ serieId })

  return reply.status(200).send({ installments })
}
