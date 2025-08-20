import type { FastifyReply, FastifyRequest } from 'fastify'

import { revokeToken } from '@/http/utils/auth'

export async function signOutController(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization
  const token = auth?.replace('Bearer ', '')
  if (token) {
    revokeToken(token)
  }
  return reply.status(200).send()
}
