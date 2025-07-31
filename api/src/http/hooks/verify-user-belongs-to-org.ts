import type { FastifyReply, FastifyRequest } from 'fastify'

import { verifyUserBelongsToOrg } from '@/functions/organization/verify-user-belongs-to-org'

export async function verifyOrgAccessHook(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params as { slug: string }

  const org = await verifyUserBelongsToOrg(request, slug)

  if (!org) {
    return reply.status(403).send({ message: 'Access denied to this organization.' })
  }

  // opcional: deixar o `org.id` disponível no request
  request.organization = org
}
