import type { FastifyReply, FastifyRequest } from 'fastify'

import { deleteRuleService } from '@/domain/alerts/rules/delete-rule'

export async function deleteRuleController(
  request: FastifyRequest<{ Params: { slug: string; id: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params

  await deleteRuleService({ id, orgId })
  return reply.status(204).send()
}
