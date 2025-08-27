import pino from 'pino'

import { env } from '../config/env'

// Tipos para os níveis de log
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// Interface para o logger
interface ILogger {
  trace(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  fatal(message: string, ...args: any[]): void
}

/**
 * Classe Logger que abstrai o Pino e controla logs baseado no ambiente
 *
 * Características:
 * - Desenvolvimento: logs coloridos e detalhados com pino-pretty
 * - Produção: logs JSON estruturados para sistemas de monitoramento
 * - Controle automático de níveis baseado no ambiente
 * - Métodos específicos para diferentes contextos (database, http, auth, etc.)
 * - Redação automática de dados sensíveis
 *
 * Uso:
 * ```typescript
 * import { logger } from '../lib/logger'
 *
 * // Logs básicos
 * logger.info('Mensagem informativa')
 * logger.error('Erro ocorreu')
 *
 * // Logs específicos por contexto
 * logger.database('Conexão estabelecida')
 * logger.http('Requisição recebida')
 * logger.auth('Usuário autenticado')
 * logger.migration('Migração executada')
 *
 * // Logs condicionais
 * logger.debug('Só aparece em desenvolvimento')
 * logger.performance('Operação', 150) // Só em dev
 * logger.sql('SELECT * FROM users') // Só se LOG_SQL=true
 * ```
 */
class Logger implements ILogger {
  private pinoLogger: pino.Logger
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = env.NODE_ENV === 'development'
    this.isProduction = env.NODE_ENV === 'production'

    // Configurar Pino baseado no ambiente
    this.pinoLogger = pino({
      level: env.LOG_LEVEL ?? (this.isProduction ? 'info' : 'debug'),
      transport: this.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      serializers: {
        err: (err: Error) => {
          return {
            message: err.message,
            stack: this.isDevelopment ? err.stack : undefined,
            name: err.name,
          }
        },
      },
      redact: ['DATABASE_URL', 'DB_PASSWORD', 'JWT_SECRET'],
    })
  }

  // Métodos de log com controle de ambiente
  trace(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      this.pinoLogger.trace(message, ...args)
    }
  }

  debug(message: string, ...args: any[]): void {
    if (!this.isProduction) {
      this.pinoLogger.debug(message, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    this.pinoLogger.info(message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.pinoLogger.warn(message, ...args)
  }

  error(message: string, ...args: any[]): void {
    this.pinoLogger.error(message, ...args)
  }

  fatal(message: string, ...args: any[]): void {
    this.pinoLogger.fatal(message, ...args)
  }

  // Métodos específicos para diferentes contextos
  database(message: string, ...args: any[]): void {
    const prefix = this.isProduction ? 'DATABASE' : '🗄️'
    this.info(`${prefix} ${message}`, ...args)
  }

  http(message: string, ...args: any[]): void {
    const prefix = this.isProduction ? 'HTTP' : '🌐'
    this.info(`${prefix} ${message}`, ...args)
  }

  auth(message: string, ...args: any[]): void {
    const prefix = this.isProduction ? 'AUTH' : '🔐'
    this.info(`${prefix} ${message}`, ...args)
  }

  migration(message: string, ...args: any[]): void {
    const prefix = this.isProduction ? 'MIGRATION' : '🔄'
    this.info(`${prefix} ${message}`, ...args)
  }

  startup(message: string, ...args: any[]): void {
    const prefix = this.isProduction ? 'STARTUP' : '🚀'
    this.info(`${prefix} ${message}`, ...args)
  }

  // Método para log de performance (só em desenvolvimento)
  performance(operation: string, duration: number): void {
    if (this.isDevelopment) {
      this.debug(`⏱️ ${operation} took ${duration}ms`)
    }
  }

  // Método para log de queries SQL (controlado por env)
  sql(query: string, params?: any[]): void {
    if (env.LOG_SQL) {
      this.debug(`📝 SQL: ${query}`, params ? { params } : '')
    }
  }

  // Método para log de Fastify (controlado por env)
  fastify(message: string, ...args: any[]): void {
    if (env.LOG_FASTIFY) {
      this.debug(`⚡ ${message}`, ...args)
    }
  }

  // Método para obter o logger Pino subjacente (para casos específicos)
  getPinoLogger(): pino.Logger {
    return this.pinoLogger
  }

  // Método para verificar se está em desenvolvimento
  isDev(): boolean {
    return this.isDevelopment
  }

  // Método para verificar se está em produção
  isProd(): boolean {
    return this.isProduction
  }
}

// Instância singleton do logger
export const logger = new Logger()

// Exportar tipos para uso em outros módulos
export type { ILogger, LogLevel }
