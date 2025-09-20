import { checkDatabaseConnection } from '@/db/setup'
import { logger } from './logger'

interface DatabaseMonitorOptions {
  intervalMs?: number
  maxRetries?: number
  failFast?: boolean // Se true, para o servidor na primeira falha
  onConnectionLost?: () => void
}

export class DatabaseMonitor {
  private intervalId: NodeJS.Timeout | null = null
  private isMonitoring = false
  private consecutiveFailures = 0
  private options: Required<DatabaseMonitorOptions>

  constructor(options: DatabaseMonitorOptions = {}) {
    this.options = {
      intervalMs: options.intervalMs ?? 15000, // 15 segundos por padrão (mais agressivo)
      maxRetries: options.maxRetries ?? 2, // Menos tentativas antes de parar
      failFast: options.failFast ?? false, // Por padrão, permite algumas tentativas
      onConnectionLost:
        options.onConnectionLost ??
        (() => {
          logger.error('💥 CRÍTICO: Conexão com banco de dados perdida!')
          logger.error('💥 O servidor será interrompido para evitar instabilidade.')
          process.exit(1)
        }),
    }
  }

  start(): void {
    if (this.isMonitoring) {
      logger.warn('Database monitor já está em execução')
      return
    }

    this.isMonitoring = true
    logger.info(
      `🔍 Iniciando monitoramento de conexão com banco de dados (intervalo: ${this.options.intervalMs}ms)`
    )

    this.intervalId = setInterval(async () => {
      await this.checkConnection()
    }, this.options.intervalMs)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isMonitoring = false
    this.consecutiveFailures = 0
    logger.info('🛑 Monitoramento de conexão com banco de dados interrompido')
  }

  private async checkConnection(): Promise<void> {
    try {
      const isConnected = await checkDatabaseConnection()

      if (isConnected) {
        if (this.consecutiveFailures > 0) {
          logger.info('✅ Conexão com banco de dados restaurada!')
        }
        this.consecutiveFailures = 0
      } else {
        this.consecutiveFailures++
        logger.warn(
          `⚠️ Falha na conexão com banco de dados (tentativa ${this.consecutiveFailures}/${this.options.maxRetries})`
        )

        // Se failFast está ativado, para na primeira falha
        if (this.options.failFast && this.consecutiveFailures === 1) {
          logger.error('💥 FailFast ativado: Parando servidor na primeira falha!')
          this.options.onConnectionLost()
        } else if (this.consecutiveFailures >= this.options.maxRetries) {
          logger.error('💥 Número máximo de falhas consecutivas atingido!')
          this.options.onConnectionLost()
        }
      }
    } catch (error) {
      this.consecutiveFailures++
      logger.error(
        `❌ Erro ao verificar conexão com banco: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )

      if (this.consecutiveFailures >= this.options.maxRetries) {
        logger.error('💥 Número máximo de falhas consecutivas atingido!')
        this.options.onConnectionLost()
      }
    }
  }

  getStatus(): { isMonitoring: boolean; consecutiveFailures: number } {
    return {
      isMonitoring: this.isMonitoring,
      consecutiveFailures: this.consecutiveFailures,
    }
  }
}

// Instância global do monitor
export const databaseMonitor = new DatabaseMonitor({
  failFast: process.env.NODE_ENV === 'production', // FailFast em produção
  intervalMs: process.env.NODE_ENV === 'production' ? 10000 : 15000, // Mais agressivo em produção
})
