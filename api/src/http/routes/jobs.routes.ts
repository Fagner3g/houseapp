import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  getJobController,
  getJobsStatsController,
  listJobsController,
  previewOverdueAlertsController,
  previewTransactionAlertsController,
  runJobController,
  sendMonthlySummaryController,
  startAllJobsController,
  startJobController,
  stopAllJobsController,
  stopJobController,
} from '../controllers/jobs.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'

// Schemas Zod
const JobConfigSchema = z.object({
  key: z.string(),
  schedule: z.string(),
  timezone: z.string(),
  description: z.string(),
})

const JobStatusSchema = z.object({
  key: z.string(),
  isRunning: z.boolean(),
  config: JobConfigSchema,
  uptime: z.number().optional(),
})

const ListJobsResponseSchema = z.object({
  jobs: z.array(JobStatusSchema),
  timestamp: z.string(),
})

const JobResultSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  errors: z.number(),
  duration: z.number(),
})

const RunJobResponseSchema = z.object({
  success: z.boolean(),
  result: JobResultSchema,
  timestamp: z.string(),
})

const JobInfoResponseSchema = z.object({
  job: JobConfigSchema,
  timestamp: z.string(),
})

const SystemStatsSchema = z.object({
  totalJobs: z.number(),
  runningJobs: z.number(),
  uptime: z.number(),
  isInitialized: z.boolean(),
})

const JobsStatsResponseSchema = z.object({
  stats: SystemStatsSchema,
  timestamp: z.string(),
})

const StopAllJobsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
})

const StopJobResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
})

const StartAllJobsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
})

const StartJobResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
})

const TransactionAlertPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  daysUntilDue: z.number(),
  alertType: z.enum(['warning', 'urgent', 'overdue']),
  ownerName: z.string(),
  ownerPhone: z.string(),
  payToName: z.string().nullable(),
  payToPhone: z.string().nullable(),
  type: z.enum(['income', 'expense']).optional(),
})

const PreviewSummarySchema = z.object({
  total: z.number(),
  today: z.number(),
  tomorrow: z.number(),
  twoDays: z.number(),
  threeToFourDays: z.number(),
})

const PreviewTransactionAlertsResponseSchema = z.object({
  preview: z.object({
    transactions: z.array(TransactionAlertPreviewSchema),
    summary: PreviewSummarySchema,
  }),
  timestamp: z.string(),
})

const OverdueAlertPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  overdueDays: z.number(),
  payToName: z.string().nullable(),
  payToPhone: z.string().nullable(),
  organizationSlug: z.string(),
  installmentInfo: z.string().nullable(),
})

const PreviewOverdueAlertsResponseSchema = z.object({
  preview: z.object({
    summary: z.object({
      total: z.number(),
      overdue: z.number(),
    }),
    transactions: z.array(OverdueAlertPreviewSchema),
  }),
  timestamp: z.string(),
})

const SendMonthlySummarySchema = z.object({
  body: z.object({ userId: z.string() }),
  response: z.object({ success: z.boolean(), phone: z.string().optional() }),
})

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export async function jobsRoutes(app: FastifyInstance) {
  type SendMonthlySummaryRoute = { Params: { slug: string }; Body: { userId: string } }
  // Listar todos os jobs
  app.get(
    '/jobs',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Lista o status de todos os jobs',
        response: {
          200: ListJobsResponseSchema,
        },
      },
    },
    listJobsController
  )

  // Executar um job específico
  app.post(
    '/jobs/:jobKey/run',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Executa um job específico manualmente',
        params: z.object({
          jobKey: z.string(),
        }),
        body: z.object({ userId: z.string().optional() }).optional(),
        response: {
          200: RunJobResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    runJobController
  )

  // Obter informações de um job específico
  app.get(
    '/jobs/:jobKey',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Retorna informações detalhadas de um job',
        params: z.object({
          jobKey: z.string(),
        }),
        response: {
          200: JobInfoResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    getJobController
  )

  // Obter estatísticas do sistema
  app.get(
    '/jobs/stats',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Retorna estatísticas do sistema de jobs',
        response: {
          200: JobsStatsResponseSchema,
        },
      },
    },
    getJobsStatsController
  )

  // Parar todos os jobs (apenas para administradores)
  app.post(
    '/jobs/stop-all',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Para todos os jobs do sistema',
        response: {
          200: StopAllJobsResponseSchema,
        },
      },
    },
    stopAllJobsController
  )

  // Parar um job específico
  app.post(
    '/jobs/:jobKey/stop',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Para um job específico',
        params: z.object({
          jobKey: z.string(),
        }),
        response: {
          200: StopJobResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    stopJobController
  )

  // Iniciar um job específico
  app.post(
    '/jobs/:jobKey/start',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Inicia um job específico',
        params: z.object({
          jobKey: z.string(),
        }),
        response: {
          200: StartJobResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    startJobController
  )

  // Iniciar todos os jobs
  app.post(
    '/jobs/start-all',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Inicia todos os jobs do sistema',
        response: {
          200: StartAllJobsResponseSchema,
        },
      },
    },
    startAllJobsController
  )

  // Preview dos alertas de transação
  app.get(
    '/jobs/transactions:alerts/preview',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Jobs'],
        summary: 'Preview das transações que seriam processadas pelo job de alertas',
        security: [{ bearerAuth: [] }],
        querystring: z.object({ userId: z.string().optional() }).optional(),
        response: {
          200: PreviewTransactionAlertsResponseSchema,
        },
      },
    },
    previewTransactionAlertsController
  )

  // Preview dos alertas de transações vencidas
  app.get(
    '/jobs/overdue-alerts/preview',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Jobs'],
        summary:
          'Preview das transações vencidas que seriam processadas pelo job de alertas vencidas',
        security: [{ bearerAuth: [] }],
        querystring: z.object({ userId: z.string().optional() }).optional(),
        response: {
          200: PreviewOverdueAlertsResponseSchema,
        },
      },
    },
    previewOverdueAlertsController
  )

  // Enviar resumo mensal via WhatsApp para um usuário específico
  app.post<SendMonthlySummaryRoute>(
    '/org/:slug/jobs/send-monthly-summary',
    {
      onRequest: [authenticateUserHook],
      preHandler: [verifyOrgAccessHook],
      schema: {
        tags: ['Jobs'],
        summary: 'Envia resumo mensal via WhatsApp para um usuário da organização',
        security: [{ bearerAuth: [] }],
        params: z.object({ slug: z.string() }),
        body: SendMonthlySummarySchema.shape.body,
        response: { 200: SendMonthlySummarySchema.shape.response, 400: ErrorResponseSchema },
      },
    },
    sendMonthlySummaryController
  )
}
