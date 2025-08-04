import type { FastifyReply, FastifyRequest } from 'fastify'

import { getInvite } from '@/domain/invite/get-invite'
import type { GetInviteParams } from '@/http/schemas/invite/get-invite.schema'

type Req = FastifyRequest<{ Params: GetInviteParams }>

export async function getInviteController(request: Req, reply: FastifyReply) {
  const { token } = request.params
  const { invite } = await getInvite({ token })
  return reply.status(200).send({ invite })
}
