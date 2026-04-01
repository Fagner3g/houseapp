import z from 'zod'

import { reminderItemResponseSchema } from './shared'

export const getInvestmentDashboardSchema = {
  tags: ['Investments'],
  description: 'Get personal investment dashboard',
  operationId: 'getInvestmentDashboard',
  response: {
    200: z.object({
      dashboard: z.object({
        summary: z.object({
          totalInvested: z.number(),
          currentValue: z.number(),
          yieldAmount: z.number(),
          yieldPercent: z.number(),
          investedThisMonth: z.number(),
          pendingThisMonth: z.number(),
        }),
        assets: z.array(
          z.object({
            id: z.string(),
            symbol: z.string(),
            displayName: z.string(),
            assetClass: z.string(),
            quantity: z.number(),
            averagePrice: z.number(),
            currentPrice: z.number(),
            currentPriceSource: z.enum(['auto', 'manual']),
            totalInvested: z.number(),
            currentValue: z.number(),
            yieldAmount: z.number(),
            yieldPercent: z.number(),
          })
        ),
        pending: z.array(reminderItemResponseSchema),
        projection: z.array(
          z.object({
            month: z.string(),
            plannedAmount: z.number(),
            cumulativeAmount: z.number(),
            projectedMarketValue: z.number(),
          })
        ),
        recentExecutions: z.array(
          z.object({
            id: z.string(),
            assetId: z.string(),
            planId: z.string().nullable(),
            referenceMonth: z.string(),
            investedAmount: z.number(),
            executedQuantity: z.number(),
            executedUnitPrice: z.number(),
            executedAt: z.string(),
          })
        ),
      }),
    }),
  },
}
