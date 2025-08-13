import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateTagService } from '@/domain/tags/update-tag'
import type {
  UpdateTagSchemaBody,
  UpdateTagSchemaParams,
} from '@/http/schemas/tag/update-tag.schema'

interface Req
  extends FastifyRequest<{
    Params: UpdateTagSchemaParams
    Body: UpdateTagSchemaBody
  }> {}

export async function updateTagController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id
  const { id } = request.params
  const { name, color } = request.body

  const { tag } = await updateTagService({ id, orgId, name, color })

  return reply.status(200).send({ tag })
}
