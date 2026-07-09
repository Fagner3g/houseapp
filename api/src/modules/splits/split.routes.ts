import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  createSplitController,
  cancelSplitPaymentController,
  deleteSplitController,
  getSplitDebtSummaryController,
  listPendingSplitsController,
  listSplitPaymentsController,
  listSplitTransactionIdsController,
  listSplitsController,
  registerSplitPaymentController,
  updateSplitController,
} from './split.controller'
import {
  createSplitSchema,
  cancelSplitPaymentSchema,
  deleteSplitSchema,
  getSplitDebtSummarySchema,
  listPendingSplitsSchema,
  listSplitPaymentsSchema,
  listSplitTransactionIdsSchema,
  listSplitsSchema,
  registerSplitPaymentSchema,
  updateSplitSchema,
} from './split.schema'

export const splitsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/splits/pending', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listPendingSplitsSchema,
    handler: listPendingSplitsController,
  })

  app.post('/organizations/:slug/splits/transaction-ids', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listSplitTransactionIdsSchema,
    handler: listSplitTransactionIdsController,
  })

  app.get('/organizations/:slug/transactions/:transactionId/splits', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listSplitsSchema,
    handler: listSplitsController,
  })

  app.get('/organizations/:slug/transactions/:transactionId/split-debt-summary', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getSplitDebtSummarySchema,
    handler: getSplitDebtSummaryController,
  })

  app.post('/organizations/:slug/transactions/:transactionId/splits', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createSplitSchema,
    handler: createSplitController,
  })

  app.patch('/organizations/:slug/transactions/:transactionId/splits/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateSplitSchema,
    handler: updateSplitController,
  })

  app.delete('/organizations/:slug/transactions/:transactionId/splits/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteSplitSchema,
    handler: deleteSplitController,
  })

  app.get('/organizations/:slug/transactions/:transactionId/splits/:id/payments', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listSplitPaymentsSchema,
    handler: listSplitPaymentsController,
  })

  app.post('/organizations/:slug/transactions/:transactionId/splits/:id/payments', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: registerSplitPaymentSchema,
    handler: registerSplitPaymentController,
  })

  app.delete('/organizations/:slug/transactions/:transactionId/splits/:id/payments/:paymentId', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: cancelSplitPaymentSchema,
    handler: cancelSplitPaymentController,
  })
}
