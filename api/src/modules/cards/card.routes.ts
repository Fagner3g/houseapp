import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  blockCardController,
  createCardController,
  deleteCardController,
  getCardController,
  listCardsController,
  unblockCardController,
  updateCardController,
} from './card.controller'
import {
  blockCardSchema,
  createCardSchema,
  deleteCardSchema,
  getCardSchema,
  listCardsSchema,
  unblockCardSchema,
  updateCardSchema,
} from './card.schema'

export const cardsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/accounts/:accountId/cards', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listCardsSchema,
    handler: listCardsController,
  })

  app.post('/organizations/:slug/accounts/:accountId/cards', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createCardSchema,
    handler: createCardController,
  })

  app.get('/organizations/:slug/accounts/:accountId/cards/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getCardSchema,
    handler: getCardController,
  })

  app.patch('/organizations/:slug/accounts/:accountId/cards/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateCardSchema,
    handler: updateCardController,
  })

  app.delete('/organizations/:slug/accounts/:accountId/cards/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteCardSchema,
    handler: deleteCardController,
  })

  app.patch('/organizations/:slug/accounts/:accountId/cards/:id/block', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: blockCardSchema,
    handler: blockCardController,
  })

  app.patch('/organizations/:slug/accounts/:accountId/cards/:id/unblock', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: unblockCardSchema,
    handler: unblockCardController,
  })
}
