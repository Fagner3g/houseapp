import type { FastifyReply, FastifyRequest } from 'fastify'

import { inviteService } from '@/domain/invite'
import type {
  CreateInviteBody,
  CreateInviteParams,
} from '@/http/schemas/invite/create-invite.schema'

type Req = FastifyRequest<{ Params: CreateInviteParams; Body: CreateInviteBody }>

export async function createInviteController(request: Req, reply: FastifyReply) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const { email } = request.body

  await inviteService.create({ email, orgId, userId })

  return reply.status(201).send(null)
}
