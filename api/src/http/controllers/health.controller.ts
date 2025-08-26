import type { FastifyReply, FastifyRequest } from 'fastify'

export async function healthController(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({ status: 'ok', timestamp: new Date().toISOString() })
}
