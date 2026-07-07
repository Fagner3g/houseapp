import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  getStatementController,
  importStatementController,
  listStatementsController,
  parseStatementCsvController,
  parseStatementOfxController,
  parseStatementOfxOrgController,
  parseStatementPdfController,
} from './statement.controller'
import {
  getStatementSchema,
  importStatementSchema,
  listStatementsSchema,
  parseStatementCsvSchema,
  parseStatementOfxOrgSchema,
  parseStatementOfxSchema,
  parseStatementPdfSchema,
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

  app.post('/organizations/:slug/accounts/:accountId/statements/parse-pdf', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: parseStatementPdfSchema,
    handler: parseStatementPdfController,
  })

  app.post('/organizations/:slug/accounts/:accountId/statements/parse-csv', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: parseStatementCsvSchema,
    handler: parseStatementCsvController,
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
