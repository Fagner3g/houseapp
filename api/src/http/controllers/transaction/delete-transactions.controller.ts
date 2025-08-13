import type { FastifyReply, FastifyRequest } from 'fastify'

import { deleteTransactionsService } from '@/domain/transactions/delete-transactions'
import type {
  DeleteTransactionsSchemaBody,
  DeleteTransactionsSchemaParams,
} from '@/http/schemas/transaction/delete-transactions.schema'

type Req = FastifyRequest<{
  Params: DeleteTransactionsSchemaParams
  Body: DeleteTransactionsSchemaBody
}>

export async function deleteTransactionsController(request: Req, reply: FastifyReply) {
  const ownerId = request.user.sub
  const organizationId = request.organization.id
  const { ids } = request.body

  await deleteTransactionsService({ ids, ownerId, organizationId })

  return reply.status(200).send()
}
