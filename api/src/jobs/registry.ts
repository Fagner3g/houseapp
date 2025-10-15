import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobConfig, JobResult } from './types'

/**
 * Registry centralizado para gerenciar o ciclo de vida dos jobs
 */
export class JobRegistry {
  private static instance: JobRegistry
  private isInitialized = false
  private initializationTime?: Date

  private constructor() {}

  static getInstance(): JobRegistry {
    if (!JobRegistry.instance) {
      JobRegistry.instance = new JobRegistry()
    }
    return JobRegistry.instance
  }

  /**
   * Inicializa o sistema de jobs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('⚠️ Sistema de jobs já foi inicializado')
      return
    }

    try {
      this.initializationTime = new Date()
      logger.info('🚀 Inicializando JobRegistry...')

      // Aguardar um pouco para garantir que todos os imports foram processados
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verificar se todos os jobs foram registrados
      await this.validateJobs()

      // Log de resumo
      this.logJobSummary()

      this.isInitialized = true
      logger.info('✅ JobRegistry inicializado com sucesso')
    } catch (error) {
      logger.error({ error }, '❌ Erro ao inicializar JobRegistry')
      throw error
    }
  }

  /**
   * Valida se todos os jobs esperados foram registrados
   */
  private async validateJobs(): Promise<void> {
    const registeredJobs = jobManager.getJobStatus()
    const expectedJobKeys = Object.values(JOB_CONFIGS).map(config => config.key)

    logger.info(
      {
        registered: registeredJobs.length,
        expected: expectedJobKeys.length,
        jobs: registeredJobs.map(j => j.key),
      },
      '📋 Validando jobs registrados'
    )

    // Verificar jobs faltando
    const missingJobs = expectedJobKeys.filter(
      expected => !registeredJobs.some(registered => registered.key === expected)
    )

    if (missingJobs.length > 0) {
      logger.warn({ missingJobs }, '⚠️ Alguns jobs não foram registrados')
    }

    // Verificar jobs extras (não esperados)
    const extraJobs = registeredJobs.filter(registered => !expectedJobKeys.includes(registered.key))

    if (extraJobs.length > 0) {
      logger.warn(
        { extraJobs: extraJobs.map(j => j.key) },
        '⚠️ Jobs extras encontrados (não configurados)'
      )
    }
  }

  /**
   * Log resumo de todos os jobs
   */
  private logJobSummary(): void {
    logger.info('📊 Resumo dos Jobs Configurados:')

    for (const config of Object.values(JOB_CONFIGS)) {
      const status = jobManager.getJobStatus().find(j => j.key === config.key)

      logger.info(
        {
          key: config.key,
          schedule: config.schedule,
          timezone: config.timezone,
          isRunning: status?.isRunning ?? false,
        },
        `  📅 ${config.description}`
      )
    }
  }

  /**
   * Executa um job específico
   */
  async runJob(jobKey: string, userId?: string): Promise<JobResult | null> {
    if (!this.isInitialized) {
      throw new Error('JobRegistry não foi inicializado')
    }

    if (!this.jobExists(jobKey)) {
      logger.warn({ jobKey }, '⚠️ Tentativa de executar job inexistente')
      return null
    }

    try {
      logger.info({ jobKey, userId }, '🚀 Executando job manualmente')
      const result = await jobManager.runJobNow(jobKey, userId)

      if (result) {
        logger.info(
          {
            jobKey,
            processed: result.processed,
            errors: result.errors,
            duration: result.duration,
          },
          '✅ Job executado com sucesso'
        )
      }

      return result
    } catch (error) {
      logger.error({ error, jobKey }, '❌ Erro ao executar job')
      throw error
    }
  }

  /**
   * Para um job específico
   */
  stopJob(jobKey: string): void {
    if (!this.jobExists(jobKey)) {
      logger.warn({ jobKey }, '⚠️ Tentativa de parar job inexistente')
      return
    }

    jobManager.stopJob(jobKey)
    logger.info({ jobKey }, '⏹️ Job parado')
  }

  /**
   * Inicia um job específico
   */
  startJob(jobKey: string): void {
    if (!this.jobExists(jobKey)) {
      logger.warn({ jobKey }, '⚠️ Tentativa de iniciar job inexistente')
      return
    }

    const config = this.getJobInfo(jobKey)
    if (!config) {
      logger.error({ jobKey }, '❌ Configuração do job não encontrada')
      return
    }

    jobManager.startJob(jobKey, config)
    logger.info({ jobKey }, '▶️ Job iniciado')
  }

  /**
   * Para todos os jobs
   */
  stopAllJobs(): void {
    logger.info('⏹️ Parando todos os jobs...')
    jobManager.stopAllJobs()
    logger.info('✅ Todos os jobs foram parados')
  }

  /**
   * Inicia todos os jobs (apenas os que estão parados)
   */
  startAllJobs(): void {
    logger.info('▶️ Iniciando todos os jobs...')

    for (const config of Object.values(JOB_CONFIGS)) {
      const status = jobManager.getJobStatus().find(j => j.key === config.key)

      if (!status?.isRunning) {
        logger.info({ jobKey: config.key }, '▶️ Iniciando job parado')
        jobManager.startJob(config.key, config)
      } else {
        logger.info({ jobKey: config.key }, '⏭️ Job já está rodando, pulando')
      }
    }

    logger.info('✅ Todos os jobs foram iniciados')
  }

  /**
   * Retorna status detalhado de todos os jobs
   */
  getJobsStatus(): Array<{
    key: string
    isRunning: boolean
    config: JobConfig
    uptime?: number
  }> {
    const status = jobManager.getJobStatus()

    return status
      .map(job => {
        const config = Object.values(JOB_CONFIGS).find(c => c.key === job.key)
        if (!config) {
          logger.warn({ jobKey: job.key }, '⚠️ Configuração não encontrada para job')
          return null
        }

        return {
          key: job.key,
          isRunning: job.isRunning,
          config,
          uptime: this.initializationTime
            ? Date.now() - this.initializationTime.getTime()
            : undefined,
        }
      })
      .filter(Boolean) as Array<{
      key: string
      isRunning: boolean
      config: JobConfig
      uptime?: number
    }>
  }

  /**
   * Verifica se um job existe
   */
  jobExists(jobKey: string): boolean {
    return Object.values(JOB_CONFIGS).some(config => config.key === jobKey)
  }

  /**
   * Retorna informações de um job específico
   */
  getJobInfo(jobKey: string): JobConfig | null {
    return Object.values(JOB_CONFIGS).find(config => config.key === jobKey) || null
  }

  /**
   * Retorna estatísticas do sistema
   */
  getSystemStats(): {
    totalJobs: number
    runningJobs: number
    uptime: number
    isInitialized: boolean
  } {
    const status = this.getJobsStatus()
    const runningJobs = status.filter(job => job.isRunning).length

    return {
      totalJobs: status.length,
      runningJobs,
      uptime: this.initializationTime ? Date.now() - this.initializationTime.getTime() : 0,
      isInitialized: this.isInitialized,
    }
  }

  /**
   * Reinicializa o sistema (útil para testes)
   */
  async reinitialize(): Promise<void> {
    logger.info('🔄 Reinicializando JobRegistry...')
    this.stopAllJobs()
    this.isInitialized = false
    this.initializationTime = undefined
    await this.initialize()
  }
}

// Instância singleton
export const jobRegistry = JobRegistry.getInstance()
