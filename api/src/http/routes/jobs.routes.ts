import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  getJobController,
  getJobsStatsController,
  listJobsController,
  runJobController,
  startAllJobsController,
  startJobController,
  stopAllJobsController,
  stopJobController,
} from '../controllers/jobs.controller'

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

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export async function jobsRoutes(app: FastifyInstance) {
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
}
