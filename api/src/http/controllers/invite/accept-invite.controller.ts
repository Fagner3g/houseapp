import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AcceptInviteSchemaParams } from '@/http/schemas/invite/accept-invite.schema'

type Req = FastifyRequest<{ Params: AcceptInviteSchemaParams }>

export async function acceptInviteController(request: Req, reply: FastifyReply) {
  const userId = request.user.sub
  const token = request.params.token
  void userId
  void token

  // Integration with acceptInvite disabled

  return reply.status(200).send()
}
