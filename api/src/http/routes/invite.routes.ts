import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { acceptInviteController } from '../controllers/invite/accept-invite.controller'
import { createInviteController } from '../controllers/invite/create-invite.controller'
import { getInviteController } from '../controllers/invite/get-invite.controller'
import { acceptInviteSchema } from '../schemas/invite/accept-invite.schema'
import { createInviteSchema } from '../schemas/invite/create-invite.schema'
import { getInviteSchema } from '../schemas/invite/get-invite.schema'

export const acceptInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/invite/:token/accept', {
    schema: acceptInviteSchema,
    handler: acceptInviteController,
  })
}

export const createInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/invite', {
    onRequest: [authenticateUserHook],
    schema: createInviteSchema,
    handler: createInviteController,
  })
}

export const getInvitesRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/invites', {
    onRequest: [authenticateUserHook],
    schema: getInviteSchema,
    handler: getInviteController,
  })
}
