import z from 'zod'

const slugParams = z.object({ slug: z.string() })

const reportDateQuery = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

const upcomingTransactionSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.string().nullable(),
  type: z.string(),
  date: z.string(),
  status: z.string(),
  accountId: z.string().nullable(),
})

export const summaryReportSchema = {
  tags: ['Reports'],
  description: 'Organization financial summary for a date range',
  operationId: 'getReportSummary',
  params: slugParams,
  querystring: reportDateQuery,
  response: {
    200: z.object({
      totalIncome: z.string(),
      totalExpense: z.string(),
      myExpenseTotal: z.string(),
      netWorth: z.string(),
      pendingCount: z.number(),
      overdueCount: z.number(),
      pendingSplitsTotal: z.string(),
      myPendingSplitsTotal: z.string(),
      upcoming: z.array(upcomingTransactionSchema),
    }),
  },
}

export const byAccountReportSchema = {
  tags: ['Reports'],
  description: 'Income, expense and balance per account',
  operationId: 'getReportByAccount',
  params: slugParams,
  querystring: reportDateQuery,
  response: {
    200: z.object({
      accounts: z.array(
        z.object({
          accountId: z.string(),
          name: z.string(),
          type: z.string(),
          balance: z.string(),
          income: z.string(),
          expense: z.string(),
        })
      ),
    }),
  },
}

const reportScopeQuery = {
  accountId: z.string().optional(),
  scope: z.enum(['all', 'credit_card']).optional().default('all'),
  statementId: z.string().optional(),
  excludeImported: z.coerce.boolean().optional(),
}

export const byCategoryReportSchema = {
  tags: ['Reports'],
  description: 'Spending or income breakdown by category',
  operationId: 'getReportByCategory',
  params: slugParams,
  querystring: reportDateQuery.extend({
    type: z.enum(['expense', 'income']),
    personal: z.coerce.boolean().optional().default(false),
    ...reportScopeQuery,
  }),
  response: {
    200: z.object({
      categories: z.array(
        z.object({
          categoryId: z.string(),
          name: z.string(),
          color: z.string().nullable(),
          total: z.string(),
          percentage: z.string(),
        })
      ),
    }),
  },
}

export const byCardReportSchema = {
  tags: ['Reports'],
  description: 'Top credit card expense transactions for a date range',
  operationId: 'getReportByCard',
  params: slugParams,
  querystring: reportDateQuery,
  response: {
    200: z.object({
      transactions: z.array(
        z.object({
          transactionId: z.string(),
          title: z.string(),
          amount: z.string(),
          myAmount: z.string(),
          purchaseDate: z.string(),
          cardId: z.string().nullable(),
          cardLabel: z.string().nullable(),
          lastFourDigits: z.string().nullable(),
          accountId: z.string(),
          accountName: z.string(),
          percentage: z.string(),
        })
      ),
      grandTotal: z.string(),
      myGrandTotal: z.string(),
    }),
  },
}

export const trendsReportSchema = {
  tags: ['Reports'],
  description: 'Monthly income and expense trends',
  operationId: 'getReportTrends',
  params: slugParams,
  querystring: z.object({
    months: z.coerce.number().int().min(1).max(24).optional().default(6),
    endMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
  response: {
    200: z.object({
      months: z.array(
        z.object({
          month: z.string(),
          income: z.string(),
          expense: z.string(),
          balance: z.string(),
        })
      ),
    }),
  },
}

export const dailyReportSchema = {
  tags: ['Reports'],
  description: 'Daily income and expense totals for a date range',
  operationId: 'getReportDaily',
  params: slugParams,
  querystring: reportDateQuery,
  response: {
    200: z.object({
      days: z.array(
        z.object({
          date: z.string(),
          income: z.string(),
          expense: z.string(),
        })
      ),
    }),
  },
}

export const insightsReportSchema = {
  tags: ['Reports'],
  description: 'AI-generated financial insights and savings tips',
  operationId: 'getReportInsights',
  params: slugParams,
  querystring: reportDateQuery,
  response: {
    200: z.object({
      insights: z.array(
        z.object({
          title: z.string(),
          body: z.string(),
          type: z.enum(['warning', 'tip', 'positive']),
        })
      ),
      source: z.enum(['ai', 'fallback']),
    }),
  },
}

export const topMerchantsReportSchema = {
  tags: ['Reports'],
  description: 'Top expense merchants/items grouped by normalized title (personal scope)',
  operationId: 'getReportTopMerchants',
  params: slugParams,
  querystring: reportDateQuery.extend({
    limit: z.coerce.number().int().min(1).max(50).optional().default(15),
    ...reportScopeQuery,
  }),
  response: {
    200: z.object({
      merchants: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          total: z.string(),
          occurrenceCount: z.number(),
          isRecurring: z.boolean(),
          hasInstallments: z.boolean(),
          avgAmount: z.string(),
          lastDate: z.string(),
          percentage: z.string(),
        })
      ),
      merchantCount: z.number(),
      grandTotal: z.string(),
    }),
  },
}

export type ReportDateQuery = z.infer<typeof reportDateQuery>
export type ByCategoryReportQuery = z.infer<typeof byCategoryReportSchema.querystring>
export type TopMerchantsReportQuery = z.infer<typeof topMerchantsReportSchema.querystring>
