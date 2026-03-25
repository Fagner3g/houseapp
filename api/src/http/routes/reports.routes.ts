import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { getTransactionReportsController } from '../controllers/reports.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

const MonthlyStatsSchema = z.object({
  totalTransactions: z.number(),
  totalAmount: z.number(),
  paidTransactions: z.number(),
  pendingTransactions: z.number(),
  overdueTransactions: z.number(),
})

const TagBreakdownItemSchema = z.object({
  category: z.string(),
  count: z.number(),
  totalAmount: z.number(),
  color: z.string().optional(),
})

const ChartDataSchema = z.object({
  dailyTransactions: z.array(
    z.object({
      date: z.string(),
      paid: z.number(),
      pending: z.number(),
      total: z.number(),
    })
  ),
  categoryBreakdown: z.array(TagBreakdownItemSchema),
  incomeByTag: z.array(TagBreakdownItemSchema),
  expenseByTag: z.array(TagBreakdownItemSchema),
  statusDistribution: z.object({
    paid: z.number(),
    pending: z.number(),
    overdue: z.number(),
  }),
})

const KPISchema = z.object({
  totalMonth: z.number(),
  incomeRegistered: z.number(),
  expenseRegistered: z.number(),
  receivedTotal: z.number(),
  toReceiveTotal: z.number(),
  toSpendTotal: z.number(),
})

const TransactionAlertPreviewSchema = z.object({
  id: z.string(),
  seriesId: z.string().optional(),
  title: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  daysUntilDue: z.number().optional(),
  alertType: z.enum(['warning', 'urgent', 'overdue']).optional(),
  ownerName: z.string(),
  ownerPhone: z.string().optional(),
  payToName: z.string().nullable().optional(),
  payToPhone: z.string().nullable().optional(),
  payToEmail: z.string().optional(),
  status: z.enum(['paid', 'pending']).optional(),
  type: z.enum(['income', 'expense']).optional(),
})

const PreviewSummarySchema = z.object({
  total: z.number(),
  today: z.number(),
  tomorrow: z.number(),
  twoDays: z.number(),
  threeToFourDays: z.number(),
})

const TransactionReportsResponseSchema = z.object({
  reports: z.object({
    upcomingAlerts: z.object({
      transactions: z.array(TransactionAlertPreviewSchema),
      summary: PreviewSummarySchema,
    }),
    monthlyStats: MonthlyStatsSchema,
    chartData: ChartDataSchema,
    kpis: KPISchema.optional(),
    counterparties: z
      .object({
        toReceive: z.array(
          z.object({
            name: z.string(),
            amount: z.number(),
            items: z.array(z.object({ title: z.string(), amount: z.number() })),
          })
        ),
        toPay: z.array(
          z.object({
            name: z.string(),
            amount: z.number(),
            items: z.array(z.object({ title: z.string(), amount: z.number() })),
          })
        ),
      })
      .optional(),
    overdueTransactions: z
      .object({
        summary: z.object({ total: z.number() }),
        transactions: z.array(
          z.object({
            id: z.string(),
            seriesId: z.string().optional(),
            title: z.string(),
            amount: z.number(),
            dueDate: z.string(),
            ownerName: z.string(),
            ownerId: z.string().optional(),
            payTo: z.string().optional(),
            payToId: z.string().optional(),
            payToName: z.string().optional(),
            payToEmail: z.string().optional(),
            status: z.enum(['paid', 'pending']).optional(),
            overdueDays: z.number().optional(),
            type: z.enum(['income', 'expense']).optional(),
          })
        ),
      })
      .optional(),
    paidThisMonth: z
      .object({
        summary: z.object({ total: z.number(), totalAmount: z.number() }),
        transactions: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            amount: z.number(),
            dueDate: z.string(),
            paidAt: z.string().nullable().optional(),
            ownerName: z.string(),
            ownerId: z.string().optional(),
            payTo: z.string().optional(),
            payToId: z.string().optional(),
            payToName: z.string().optional(),
            payToEmail: z.string().optional(),
            status: z.enum(['paid', 'pending']).optional(),
          })
        ),
      })
      .optional(),
    allTransactions: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          amount: z.number(),
          dueDate: z.string(),
          status: z.enum(['paid', 'pending']),
          paidAt: z.string().nullable(),
          type: z.enum(['income', 'expense']),
        })
      )
      .optional(),
  }),
  timestamp: z.string(),
})

export async function transactionReportsRoute(app: FastifyInstance) {
  app.get(
    '/org/:slug/reports/transactions',
    {
      onRequest: [authenticateUserHook],
      preHandler: [verifyOrgAccessHook],
      schema: {
        tags: ['Reports'],
        summary: 'Retorna dados consolidados para o dashboard da organização',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        querystring: z.object({
          year: z.string().optional(),
          month: z.string().optional(),
        }),
        response: {
          200: TransactionReportsResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    getTransactionReportsController
  )
}
