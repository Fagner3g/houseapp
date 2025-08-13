import type { FastifyReply, FastifyRequest } from 'fastify'

import { listTagsService } from '@/domain/tags/list-tags'

type Req = FastifyRequest<{ Params: { slug: string } }>

export async function listTagsController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id

  const { tags } = await listTagsService({ orgId })

  return reply.status(200).send({ tags })
}
