import type { FastifyReply, FastifyRequest } from 'fastify'

import { listRulesService } from '@/domain/alerts/rules/list-rules'

export async function listRulesController(
  request: FastifyRequest<{
    Params: { slug: string }
    Querystring: { scope?: 'organization' | 'series' }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const result = await listRulesService({
    orgId,
    scope: request.query.scope,
  })
  return reply.status(200).send(result)
}
