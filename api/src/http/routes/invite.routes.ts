import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { acceptInviteController } from '../controllers/invite/accept-invite.controller'
import { acceptInviteSchema } from '../schemas/invite/accept-invite.schema'
import { createInviteSchema } from '../schemas/invite/create-invite.schema'

export const acceptInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/invites/:token/accept', {
    onRequest: [authenticateUserHook],
    schema: acceptInviteSchema,
    handler: acceptInviteController,
  })
}

export const createInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/invites', {
    onRequest: [authenticateUserHook],
    schema: createInviteSchema,
    handler: acceptInviteController,
  })
}

import { getInviteController } from '../controllers/invite/get-invite.controller'
import { getInviteSchema } from '../schemas/invite/get-invite.schema'

export const getInviteRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/invites/:token',
    {
      schema: getInviteSchema,
    },
    getInviteController
  )
}
