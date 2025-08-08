import type { FastifyReply, FastifyRequest } from 'fastify'

import { acceptInvite } from '@/domain/invite/accept-invite'
import type { AcceptInviteSchemaParams } from '@/http/schemas/invite/accept-invite.schema'

type Req = FastifyRequest<{ Params: AcceptInviteSchemaParams }>

export async function acceptInviteController(request: Req, reply: FastifyReply) {
  const { token } = request.params
  const userId = request.user.sub

  //await acceptInvite({ token, userId })

  return reply.status(200).send()
}
