import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  getStatementController,
  importStatementController,
  listStatementsController,
  parseStatementOfxController,
  parseStatementOfxOrgController,
  parseStatementXlsxController,
} from './statement.controller'
import {
  getStatementSchema,
  importStatementSchema,
  listStatementsSchema,
  parseStatementOfxOrgSchema,
  parseStatementOfxSchema,
  parseStatementXlsxSchema,
} from './statement.schema'

export const statementsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/accounts/:accountId/statements', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listStatementsSchema,
    handler: listStatementsController,
  })

  app.post('/organizations/:slug/accounts/:accountId/statements', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: importStatementSchema,
    handler: importStatementController,
  })

  app.post('/organizations/:slug/accounts/:accountId/statements/parse-xlsx', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: parseStatementXlsxSchema,
    handler: parseStatementXlsxController,
  })

  app.post('/organizations/:slug/statements/parse-ofx', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: parseStatementOfxOrgSchema,
    handler: parseStatementOfxOrgController,
  })

  app.post('/organizations/:slug/accounts/:accountId/statements/parse-ofx', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: parseStatementOfxSchema,
    handler: parseStatementOfxController,
  })

  app.get('/organizations/:slug/accounts/:accountId/statements/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getStatementSchema,
    handler: getStatementController,
  })
}
