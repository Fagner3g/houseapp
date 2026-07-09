import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  aiChatController,
  confirmAiActionController,
  listAiProvidersController,
  rejectAiActionController,
} from './ai.controller'
import {
  aiChatSchema,
  confirmAiActionSchema,
  listAiProvidersSchema,
  rejectAiActionSchema,
} from './ai.schema'

export const aiRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/ai/providers', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listAiProvidersSchema,
    handler: listAiProvidersController,
  })

  app.post('/organizations/:slug/ai/chat', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: aiChatSchema,
    handler: aiChatController,
  })

  app.post('/organizations/:slug/ai/actions/confirm', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: confirmAiActionSchema,
    handler: confirmAiActionController,
  })

  app.post('/organizations/:slug/ai/actions/reject', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: rejectAiActionSchema,
    handler: rejectAiActionController,
  })
}
