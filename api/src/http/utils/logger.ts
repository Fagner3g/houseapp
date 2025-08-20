import pino from 'pino'

import { env } from '../../config/env'

const showStack = String(process.env.LOG_STACK ?? '').toLowerCase() === 'true'

export const logger = pino({
  level: env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  serializers: {
    err: (err: Error) => {
      return showStack ? { message: err.message, stack: err.stack } : { message: err.message }
    },
  },
  redact: ['DATABASE_URL'],
})
