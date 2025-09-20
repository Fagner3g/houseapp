import type { FastifyReply, FastifyRequest } from 'fastify'

import { checkDatabaseConnection } from '@/db/setup'
import { databaseMonitor } from '@/lib/database-monitor'
import { logger } from '@/lib/logger'

export async function healthController(_request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verificar conexão com o banco de dados
    const dbConnected = await checkDatabaseConnection()

    if (!dbConnected) {
      logger.error('💥 Health check falhou: Banco de dados indisponível!')
      logger.error('💥 O servidor será interrompido para evitar instabilidade.')

      // Enviar resposta de erro antes de parar o servidor
      reply.status(503).send({
        status: 'error',
        message: 'Database connection failed - Server shutting down',
        timestamp: new Date().toISOString(),
      })

      // Parar o servidor após um pequeno delay para permitir a resposta
      setTimeout(() => {
        process.exit(1)
      }, 100)

      return
    }

    const monitorStatus = databaseMonitor.getStatus()

    return reply.status(200).send({
      status: 'ok',
      database: 'connected',
      monitor: {
        isMonitoring: monitorStatus.isMonitoring,
        consecutiveFailures: monitorStatus.consecutiveFailures,
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
