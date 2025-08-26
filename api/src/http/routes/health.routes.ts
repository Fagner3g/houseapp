import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { healthController } from '../controllers/health.controller'

export const healthRoute: FastifyPluginAsyncZod = async app => {
  app.get('/health', { handler: healthController })
}
