import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  createAccountController,
  deleteAccountController,
  getAccountController,
  listAccountsController,
  updateAccountController,
} from './account.controller'
import {
  createAccountSchema,
  deleteAccountSchema,
  getAccountSchema,
  listAccountsSchema,
  updateAccountSchema,
} from './account.schema'

export const accountsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/accounts', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listAccountsSchema,
    handler: listAccountsController,
  })

  app.post('/organizations/:slug/accounts', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createAccountSchema,
    handler: createAccountController,
  })

  app.get('/organizations/:slug/accounts/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getAccountSchema,
    handler: getAccountController,
  })

  app.patch('/organizations/:slug/accounts/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateAccountSchema,
    handler: updateAccountController,
  })

  app.delete('/organizations/:slug/accounts/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteAccountSchema,
    handler: deleteAccountController,
  })
}
