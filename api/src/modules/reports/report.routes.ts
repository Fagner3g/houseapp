import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  getByAccountReportController,
  getByCardReportController,
  getByCategoryReportController,
  getDailyReportController,
  getInsightsReportController,
  getSummaryReportController,
  getTopMerchantsReportController,
  getTrendsReportController,
} from './report.controller'
import {
  byAccountReportSchema,
  byCardReportSchema,
  byCategoryReportSchema,
  dailyReportSchema,
  insightsReportSchema,
  summaryReportSchema,
  topMerchantsReportSchema,
  trendsReportSchema,
} from './report.schema'

export const reportsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/reports/summary', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: summaryReportSchema,
    handler: getSummaryReportController,
  })

  app.get('/organizations/:slug/reports/by-account', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: byAccountReportSchema,
    handler: getByAccountReportController,
  })

  app.get('/organizations/:slug/reports/by-category', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: byCategoryReportSchema,
    handler: getByCategoryReportController,
  })

  app.get('/organizations/:slug/reports/by-card', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: byCardReportSchema,
    handler: getByCardReportController,
  })

  app.get('/organizations/:slug/reports/trends', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: trendsReportSchema,
    handler: getTrendsReportController,
  })

  app.get('/organizations/:slug/reports/daily', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: dailyReportSchema,
    handler: getDailyReportController,
  })

  app.get('/organizations/:slug/reports/insights', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: insightsReportSchema,
    handler: getInsightsReportController,
  })

  app.get('/organizations/:slug/reports/top-merchants', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: topMerchantsReportSchema,
    handler: getTopMerchantsReportController,
  })
}
