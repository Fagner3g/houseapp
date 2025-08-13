import type { FastifyReply, FastifyRequest } from 'fastify'

import { createTagService } from '@/domain/tags/create-tag'
import type {
  CreateTagSchemaBody,
  CreateTagSchemaParams,
} from '@/http/schemas/tag/create-tag.schema'

interface Req
  extends FastifyRequest<{
    Params: CreateTagSchemaParams
    Body: CreateTagSchemaBody
  }> {}

export async function createTagController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id
  const { name, color } = request.body

  const { tag } = await createTagService({ orgId, name, color })

  return reply.status(201).send({ tag })
}
