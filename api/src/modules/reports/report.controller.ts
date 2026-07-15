import type { FastifyReply, FastifyRequest } from 'fastify'

import { container } from '@/core/container'
import { toTransactionViewer } from '@/modules/transactions/transaction-visibility'

import type { ByCategoryReportQuery, ReportDateQuery, TopMerchantsReportQuery } from './report.schema'

type OrgParams = { slug: string }

function viewerFromRequest(request: FastifyRequest) {
  return toTransactionViewer(request.user.sub, request.organization.ownerId)
}

export async function getSummaryReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ReportDateQuery }>,
  reply: FastifyReply
) {
  const summary = await container.reportService.getSummary(
    request.organization.id,
    request.user.sub,
    request.query.dateFrom,
    request.query.dateTo,
    viewerFromRequest(request)
  )

  return reply.send(summary)
}

export async function getMyExpensesReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ReportDateQuery }>,
  reply: FastifyReply
) {
  const result = await container.reportService.getMyExpenses(
    request.organization.id,
    request.user.sub,
    request.query.dateFrom,
    request.query.dateTo,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function getByAccountReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ReportDateQuery }>,
  reply: FastifyReply
) {
  const accounts = await container.reportService.getByAccount(
    request.organization.id,
    request.query.dateFrom,
    request.query.dateTo,
    viewerFromRequest(request)
  )

  return reply.send({ accounts })
}

export async function getByCategoryReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ByCategoryReportQuery }>,
  reply: FastifyReply
) {
  const categories = await container.reportService.getByCategory(
    request.organization.id,
    request.query.type,
    request.query.dateFrom,
    request.query.dateTo,
    request.query.personal,
    request.user.sub,
    {
      accountId: request.query.accountId,
      scope: request.query.scope,
      statementId: request.query.statementId,
      excludeImported: request.query.excludeImported,
    },
    viewerFromRequest(request)
  )

  return reply.send({ categories })
}

export async function getByCardReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ReportDateQuery }>,
  reply: FastifyReply
) {
  const result = await container.reportService.getByCard(
    request.organization.id,
    request.query.dateFrom,
    request.query.dateTo,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function getTrendsReportController(
  request: FastifyRequest<{
    Params: OrgParams
    Querystring: { months?: number; endMonth?: string }
  }>,
  reply: FastifyReply
) {
  const result = await container.reportService.getTrends(
    request.organization.id,
    request.query.months ?? 6,
    request.query.endMonth,
    request.user.sub,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function getDailyReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ReportDateQuery }>,
  reply: FastifyReply
) {
  const result = await container.reportService.getDaily(
    request.organization.id,
    request.query.dateFrom,
    request.query.dateTo,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function getInsightsReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: ReportDateQuery }>,
  reply: FastifyReply
) {
  const result = await container.dashboardInsightsService.getInsights(
    request.organization.id,
    request.user.sub,
    request.query.dateFrom,
    request.query.dateTo,
    viewerFromRequest(request)
  )

  return reply.send(result)
}

export async function getTopMerchantsReportController(
  request: FastifyRequest<{ Params: OrgParams; Querystring: TopMerchantsReportQuery }>,
  reply: FastifyReply
) {
  const result = await container.reportService.getTopMerchants(
    request.organization.id,
    request.user.sub,
    request.query.dateFrom,
    request.query.dateTo,
    request.query.limit,
    request.query.personal,
    {
      accountId: request.query.accountId,
      scope: request.query.scope,
      statementId: request.query.statementId,
      excludeImported: request.query.excludeImported,
    },
    viewerFromRequest(request)
  )

  return reply.send(result)
}
