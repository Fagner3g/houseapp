import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  createUserWithInviteController,
  getProfileController,
  updateUserController,
} from '../controllers/user'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { createUserWithInviteSchema, getProfileSchema, updateUserSchema } from '../schemas/user'

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

export const updateUserRoute: FastifyPluginAsyncZod = async app => {
  app.patch('/org/:slug/users', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateUserSchema,
    handler: updateUserController,
  })
}
