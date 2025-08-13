import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { sigInUpController } from '../controllers/auth/sigin-up.controller'
import { signInController } from '../controllers/auth/sign-in.controller'
import { validateTokenController } from '../controllers/auth/validate-token.controller'
import { signInSchema } from '../schemas/auth/sign-in.schema'
import { sigInUpSchema } from '../schemas/auth/sign-up.schema'
import { validateTokenSchema } from '../schemas/auth/validate-token.schema'

export const signInRoute: FastifyPluginAsyncZod = async app => {
  app.post('/sign-in', { schema: signInSchema, handler: signInController })
}

export const signUpRoute: FastifyPluginAsyncZod = async app => {
  app.post('/sign-up', {
    schema: sigInUpSchema,
    handler: sigInUpController,
  })
}

export const validateTokenRoute: FastifyPluginAsyncZod = async app => {
  app.post('/validate', {
    schema: validateTokenSchema,
    handler: validateTokenController,
  })
}
