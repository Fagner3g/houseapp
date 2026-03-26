import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  createInvestmentAssetController,
  createInvestmentExecutionController,
  createInvestmentPlanController,
  deleteInvestmentAssetController,
  deleteInvestmentExecutionController,
  deleteInvestmentPlanController,
  getInvestmentDashboardController,
  getInvestmentQuotePreviewController,
  getInvestmentRemindersController,
  listInvestmentAssetsController,
  listInvestmentPlansController,
  setInvestmentQuoteController,
  updateInvestmentAssetController,
  updateInvestmentExecutionController,
  updateInvestmentPlanController,
} from '../controllers/investments.controller'
import {
  investmentsChatController,
  listAiProvidersController,
} from '../controllers/investments-chat.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { investmentsChatSchema } from '../schemas/investments-chat.schema'
import {
  createInvestmentAssetSchema,
  createInvestmentExecutionSchema,
  createInvestmentPlanSchema,
  deleteInvestmentAssetSchema,
  deleteInvestmentExecutionSchema,
  deleteInvestmentPlanSchema,
  getInvestmentDashboardSchema,
  getInvestmentQuotePreviewSchema,
  getInvestmentRemindersSchema,
  listInvestmentAssetsSchema,
  listInvestmentPlansSchema,
  setInvestmentQuoteSchema,
  updateInvestmentAssetSchema,
  updateInvestmentExecutionSchema,
  updateInvestmentPlanSchema,
} from '../schemas/investments'

export const investmentRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/me/investments/quote-preview', {
    onRequest: [authenticateUserHook],
    schema: getInvestmentQuotePreviewSchema,
    handler: getInvestmentQuotePreviewController,
  })

  app.get('/me/investments/assets', {
    onRequest: [authenticateUserHook],
    schema: listInvestmentAssetsSchema,
    handler: listInvestmentAssetsController,
  })

  app.post('/me/investments/assets', {
    onRequest: [authenticateUserHook],
    schema: createInvestmentAssetSchema,
    handler: createInvestmentAssetController,
  })

  app.patch('/me/investments/assets/:assetId', {
    onRequest: [authenticateUserHook],
    schema: updateInvestmentAssetSchema,
    handler: updateInvestmentAssetController,
  })

  app.delete('/me/investments/assets/:assetId', {
    onRequest: [authenticateUserHook],
    schema: deleteInvestmentAssetSchema,
    handler: deleteInvestmentAssetController,
  })

  app.patch('/me/investments/assets/:assetId/quote', {
    onRequest: [authenticateUserHook],
    schema: setInvestmentQuoteSchema,
    handler: setInvestmentQuoteController,
  })

  app.get('/me/investments/plans', {
    onRequest: [authenticateUserHook],
    schema: listInvestmentPlansSchema,
    handler: listInvestmentPlansController,
  })

  app.post('/me/investments/plans', {
    onRequest: [authenticateUserHook],
    schema: createInvestmentPlanSchema,
    handler: createInvestmentPlanController,
  })

  app.patch('/me/investments/plans/:planId', {
    onRequest: [authenticateUserHook],
    schema: updateInvestmentPlanSchema,
    handler: updateInvestmentPlanController,
  })

  app.delete('/me/investments/plans/:planId', {
    onRequest: [authenticateUserHook],
    schema: deleteInvestmentPlanSchema,
    handler: deleteInvestmentPlanController,
  })

  app.post('/me/investments/executions', {
    onRequest: [authenticateUserHook],
    schema: createInvestmentExecutionSchema,
    handler: createInvestmentExecutionController,
  })

  app.patch('/me/investments/executions/:executionId', {
    onRequest: [authenticateUserHook],
    schema: updateInvestmentExecutionSchema,
    handler: updateInvestmentExecutionController,
  })

  app.delete('/me/investments/executions/:executionId', {
    onRequest: [authenticateUserHook],
    schema: deleteInvestmentExecutionSchema,
    handler: deleteInvestmentExecutionController,
  })

  app.get('/me/investments/reminders', {
    onRequest: [authenticateUserHook],
    schema: getInvestmentRemindersSchema,
    handler: getInvestmentRemindersController,
  })

  app.get('/me/investments/dashboard', {
    onRequest: [authenticateUserHook],
    schema: getInvestmentDashboardSchema,
    handler: getInvestmentDashboardController,
  })

  app.get('/me/investments/ai/providers', {
    onRequest: [authenticateUserHook],
    handler: listAiProvidersController,
  })

  app.post('/me/investments/ai/chat', {
    onRequest: [authenticateUserHook],
    schema: investmentsChatSchema,
    handler: investmentsChatController,
  })
}
