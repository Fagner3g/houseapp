import pino from 'pino'

import { env } from '../config/env'

// Tipos para os níveis de log
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Interface para o logger
interface ILogger {
  debug(message: unknown, ...args: unknown[]): void
  info(message: unknown, ...args: unknown[]): void
  warn(message: unknown, ...args: unknown[]): void
  error(message: unknown, ...args: unknown[]): void
}

// Logger minimalista baseado em Pino
const base = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: env.NODE_ENV !== 'production',
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
  serializers: {
    err: (err: Error) => {
      return env.LOG_STACK ? { message: err.message, stack: err.stack } : { message: err.message }
    },
  },
  redact: ['DATABASE_URL', 'DB_PASSWORD', 'JWT_SECRET'],
})

export const logger: ILogger = {
  debug: (message, ...args) => base.debug(message, ...(args as any[])),
  info: (message, ...args) => base.info(message, ...(args as any[])),
  warn: (message, ...args) => base.warn(message, ...(args as any[])),
  error: (message, ...args) => base.error(message, ...(args as any[])),
}

// Exportar tipos para uso em outros módulos
export type { ILogger, LogLevel }
