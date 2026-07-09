import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  bulkCreateTransactionsController,
  bulkNotifyTargetController,
  bulkReviewImportController,
  createTransactionController,
  deleteTransactionController,
  getInstallmentSeriesController,
  getTransactionController,
  listTransactionsController,
  cancelTransactionPaymentController,
  payTransactionController,
  updateTransactionController,
} from './transaction.controller'
import {
  bulkCreateTransactionsSchema,
  bulkNotifyTargetSchema,
  bulkReviewImportSchema,
  cancelTransactionPaymentSchema,
  createTransactionSchema,
  deleteTransactionSchema,
  getInstallmentSeriesSchema,
  getTransactionSchema,
  listTransactionsSchema,
  payTransactionSchema,
  updateTransactionSchema,
} from './transaction.schema'

export const transactionsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/transactions', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listTransactionsSchema,
    handler: listTransactionsController,
  })

  app.post('/organizations/:slug/transactions/bulk', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: bulkCreateTransactionsSchema,
    handler: bulkCreateTransactionsController,
  })

  app.patch('/organizations/:slug/transactions/bulk-notify-target', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: bulkNotifyTargetSchema,
    handler: bulkNotifyTargetController,
  })

  app.patch('/organizations/:slug/transactions/bulk-review-import', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: bulkReviewImportSchema,
    handler: bulkReviewImportController,
  })

  app.post('/organizations/:slug/transactions', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createTransactionSchema,
    handler: createTransactionController,
  })

  app.get('/organizations/:slug/transactions/:id/installment-series', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getInstallmentSeriesSchema,
    handler: getInstallmentSeriesController,
  })

  app.get('/organizations/:slug/transactions/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getTransactionSchema,
    handler: getTransactionController,
  })

  app.patch('/organizations/:slug/transactions/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateTransactionSchema,
    handler: updateTransactionController,
  })

  app.patch('/organizations/:slug/transactions/:id/pay', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: payTransactionSchema,
    handler: payTransactionController,
  })

  app.patch('/organizations/:slug/transactions/:id/cancel-payment', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: cancelTransactionPaymentSchema,
    handler: cancelTransactionPaymentController,
  })

  app.delete('/organizations/:slug/transactions/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteTransactionSchema,
    handler: deleteTransactionController,
  })
}
