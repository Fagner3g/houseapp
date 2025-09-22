import type { FastifyReply, FastifyRequest } from 'fastify'

import { checkDatabaseConnection } from '@/db/setup'
import { databaseMonitor } from '@/lib/database-monitor'
import { logger } from '@/lib/logger'

export async function healthController(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const monitorStatus = databaseMonitor.getStatus()

    // Se o monitor está ativo, confiar nele
    if (monitorStatus.isMonitoring) {
      return reply.status(200).send({
        status: 'ok',
        database: 'connected',
        monitor: {
          isMonitoring: monitorStatus.isMonitoring,
          consecutiveFailures: monitorStatus.consecutiveFailures,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Se o monitor não está ativo, fazer verificação manual
    const dbConnected = await checkDatabaseConnection()

    if (!dbConnected) {
      logger.error('💥 Health check falhou: Banco de dados indisponível!')
      return reply.status(503).send({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      })
    }

    return reply.status(200).send({
      status: 'ok',
      database: 'connected',
      monitor: {
        isMonitoring: false,
        consecutiveFailures: 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('💥 Health check falhou:', error)
    return reply.status(503).send({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    })
  }
}
