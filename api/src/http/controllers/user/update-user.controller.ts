import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateUser } from '@/domain/user/update-user'

export async function updateUserController(request: FastifyRequest, reply: FastifyReply) {
  const { name, phone, email } = request.body as { name?: string; phone?: string; email: string }

  const org = request.organization
  if (!org?.id) return reply.status(403).send()

  const updated = await updateUser({ orgId: org.id, email, name, phone })
  if (!updated) return reply.status(404).send()

  return reply.status(200).send(updated)
}
