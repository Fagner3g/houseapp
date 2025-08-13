import type { FastifyReply, FastifyRequest } from 'fastify'

import { deleteTagService } from '@/domain/tags/delete-tag'
import type { DeleteTagSchemaParams } from '@/http/schemas/tag/delete-tag.schema'

interface Req extends FastifyRequest<{ Params: DeleteTagSchemaParams }> {}

export async function deleteTagController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id
  const { id } = request.params

  await deleteTagService({ id, orgId })

  return reply.status(200).send()
}
