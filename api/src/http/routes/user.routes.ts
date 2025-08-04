import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { getProfileController } from '../controllers/user/get-profile.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { getProfileSchema } from '../schemas/user/get-profile.schema'

export const getProfileRoute: FastifyPluginAsyncZod = async app => {
  app.get('/profile', {
    onRequest: [authenticateUserHook],
    schema: getProfileSchema,
    handler: getProfileController,
  })
}
