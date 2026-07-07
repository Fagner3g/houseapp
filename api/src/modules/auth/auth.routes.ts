import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'

import {
  logoutController,
  signInController,
  signUpController,
  validateTokenController,
} from './auth.controller'
import { logoutSchema, signInSchema, signUpSchema, validateTokenSchema } from './auth.schema'

export const authRoutes: FastifyPluginAsyncZod = async app => {
  app.post('/sign-in', { schema: signInSchema, handler: signInController })
  app.post('/sign-up', { schema: signUpSchema, handler: signUpController })
  app.post('/validate', { schema: validateTokenSchema, handler: validateTokenController })
  app.post('/logout', {
    onRequest: [authenticateUserHook],
    schema: logoutSchema,
    handler: logoutController,
  })
}
