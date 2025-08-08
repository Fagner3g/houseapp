import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { createUserWithInviteController } from '../controllers/user/create-user-with-invite.controller'
import { getProfileController } from '../controllers/user/get-profile.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { createUserWithInviteSchema } from '../schemas/user/create-user-with-invite.schema'
import { getProfileSchema } from '../schemas/user/get-profile.schema'

export const getProfileRoute: FastifyPluginAsyncZod = async app => {
  app.get('/profile', {
    onRequest: [authenticateUserHook],
    schema: getProfileSchema,
    handler: getProfileController,
  })
}

export const createUserWithInviteRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/create-user-with-invite', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createUserWithInviteSchema,
    handler: createUserWithInviteController,
  })
}
