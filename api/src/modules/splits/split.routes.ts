import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  createCollectPlanController,
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
  acceptSplitPaymentRequestController,
  createSplitPaymentRequestController,
  listSplitPaymentRequestsController,
  rejectSplitPaymentRequestController,
  acceptSplitPaymentRequestSchema,
  createSplitPaymentRequestSchema,
  listSplitPaymentRequestsSchema,
  rejectSplitPaymentRequestSchema,
} from './payment-request'
import {
  createCollectPlanSchema,
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

  app.get('/organizations/:slug/split-payment-requests', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listSplitPaymentRequestsSchema,
    handler: listSplitPaymentRequestsController,
  })

  app.post('/organizations/:slug/split-payment-requests/:requestId/accept', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: acceptSplitPaymentRequestSchema,
    handler: acceptSplitPaymentRequestController,
  })

  app.post('/organizations/:slug/split-payment-requests/:requestId/reject', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: rejectSplitPaymentRequestSchema,
    handler: rejectSplitPaymentRequestController,
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

  app.post('/organizations/:slug/transactions/:transactionId/splits/collect-plan', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createCollectPlanSchema,
    handler: createCollectPlanController,
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

  app.post(
    '/organizations/:slug/transactions/:transactionId/splits/:id/payment-requests',
    {
      onRequest: [authenticateUserHook],
      preHandler: [verifyOrgAccessHook],
      schema: createSplitPaymentRequestSchema,
      handler: createSplitPaymentRequestController,
    }
  )

  app.delete('/organizations/:slug/transactions/:transactionId/splits/:id/payments/:paymentId', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: cancelSplitPaymentSchema,
    handler: cancelSplitPaymentController,
  })
}
