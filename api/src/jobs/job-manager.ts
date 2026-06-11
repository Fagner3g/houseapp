import * as cron from 'node-cron'

import { logger } from '@/lib/logger'
import { logExecution } from './execution-log'
import type { JobConfig, JobFunction, JobResult } from './types'

function runAndLog(
  config: JobConfig,
  jobFunction: JobFunction,
  trigger: 'cron' | 'manual'
): () => Promise<void> {
  return async () => {
    const startTime = Date.now()
    const logInfo = (msg: string) =>
      logger.info({ jobKey: config.key }, msg)

    logInfo(`${trigger === 'cron' ? '⏰' : '🚀'} Iniciando job: ${config.description}`)

    try {
      const result = await jobFunction()
      const duration = Date.now() - startTime

      logExecution(config.key, {
        success: result.success,
        processed: result.processed,
        errors: result.errors,
        duration,
      })

      logger.info(
        { jobKey: config.key, duration, processed: result.processed, errors: result.errors },
        `✅ Job concluído: ${config.description}`
      )
    } catch (error) {
      const duration = Date.now() - startTime
      logExecution(config.key, {
        success: false,
        processed: 0,
        errors: 1,
        duration,
      })

      logger.error(
        { jobKey: config.key, error, duration },
        `❌ Erro no job: ${config.description}`
      )
    }
  }
}

export class JobManager {
  private static instance: JobManager
  private jobs = new Map<string, cron.ScheduledTask>()
  private jobFunctions = new Map<string, JobFunction>()
  private jobStatus = new Map<string, boolean>()

  private constructor() {}

  static getInstance(): JobManager {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager()
    }
    return JobManager.instance
  }

  registerJob(config: JobConfig, jobFunction: JobFunction): void {
    if (this.jobs.has(config.key)) {
      logger.warn({ jobKey: config.key }, 'Job já está registrado — evitando duplicar')
      return
    }

    this.jobFunctions.set(config.key, jobFunction)

    const task = cron.schedule(
      config.schedule,
      runAndLog(config, jobFunction, 'cron'),
      { timezone: config.timezone }
    )

    this.jobs.set(config.key, task)
    this.jobStatus.set(config.key, true)
    task.start()

    logger.info(
      { jobKey: config.key, schedule: config.schedule, timezone: config.timezone },
      `📅 Job agendado: ${config.description}`
    )
  }

  async runJobNow(jobKey: string, userId?: string): Promise<JobResult | null> {
    const jobFunction = this.jobFunctions.get(jobKey)
    if (!jobFunction) {
      logger.error({ jobKey }, 'Job não encontrado')
      return null
    }

    logger.info({ jobKey, userId }, '🚀 Executando job manualmente')

    const startTime = Date.now()
    const result = await jobFunction(userId, { skipTimeCheck: true })
    const duration = Date.now() - startTime

    if (result) {
      logExecution(jobKey, {
        success: result.success,
        processed: result.processed,
        errors: result.errors,
        duration,
      })
    }

    return result
  }

  stopJob(jobKey: string): void {
    const task = this.jobs.get(jobKey)
    if (task) {
      task.stop()
      this.jobs.delete(jobKey)
      // NÃO deletar jobFunction - ela é necessária para reiniciar o job
      this.jobStatus.set(jobKey, false)
      logger.info({ jobKey }, '⏹️ Job parado')
    }
  }

  startJob(jobKey: string, config: JobConfig): void {
    if (this.jobs.has(jobKey)) {
      logger.warn({ jobKey }, 'Job já está rodando — evitando duplicar')
      return
    }

    const jobFunction = this.jobFunctions.get(jobKey)
    if (!jobFunction) {
      logger.error({ jobKey }, 'Função do job não encontrada')
      return
    }

    const task = cron.schedule(
      config.schedule,
      async () => {
        const startTime = Date.now()
        logger.info({ jobKey }, `⏰ Iniciando job: ${config.description}`)

        try {
          const result = await jobFunction()
          const duration = Date.now() - startTime

          logger.info(
            {
              jobKey,
              duration,
              processed: result.processed,
              errors: result.errors,
            },
            `✅ Job concluído: ${config.description}`
          )
        } catch (error) {
          const duration = Date.now() - startTime
          logger.error(
            {
              jobKey,
              error,
              duration,
            },
            `❌ Erro no job: ${config.description}`
          )
        }
      },
      { timezone: config.timezone }
    )

    this.jobs.set(jobKey, task)
    this.jobStatus.set(jobKey, true)
    task.start()

    logger.info(
      {
        jobKey,
        schedule: config.schedule,
        timezone: config.timezone,
      },
      `▶️ Job iniciado: ${config.description}`
    )
  }

  stopAllJobs(): void {
    for (const [key, task] of this.jobs) {
      task.stop()
      this.jobStatus.set(key, false)
      logger.info({ jobKey: key }, '⏹️ Job parado')
    }
    this.jobs.clear()
    // NÃO limpar jobFunctions e jobStatus - eles são necessários para reiniciar
    logger.info('⏹️ Todos os jobs foram parados')
  }

  getJobStatus(): Array<{ key: string; isRunning: boolean }> {
    return Array.from(this.jobStatus.entries()).map(([key, isRunning]) => ({
      key,
      isRunning,
    }))
  }
}

export const jobManager = JobManager.getInstance()
