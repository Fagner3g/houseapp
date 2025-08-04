import type { FastifyReply, FastifyRequest } from 'fastify'

import { createInvite } from '@/domain/invite/create-invite'
import type {
  CreateInviteBody,
  CreateInviteParams,
} from '@/http/schemas/invite/create-invite.schema'

type Req = FastifyRequest<{ Params: CreateInviteParams; Body: CreateInviteBody }>

export async function createInviteController(request: Req, reply: FastifyReply) {
  const { slug } = request.params
  const { email } = request.body
  const { invite } = await createInvite({ email, organizationSlug: slug })
  return reply.status(201).send({ token: invite.token })
}
