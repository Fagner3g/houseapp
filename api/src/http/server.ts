import { env } from '@/config/env'
import { runMigrations, setupDatabase } from '@/db/setup'
import { registerJobs } from '@/jobs'
import { databaseMonitor } from '../lib/database-monitor'
import { logger } from '../lib/logger'
import { buildServer } from './utils/setup'

export async function server() {
  try {
    await setupDatabase()

    await runMigrations()

    registerJobs()

    // Iniciar monitoramento de conexão com banco de dados
    databaseMonitor.start()

    const server = await buildServer()

    try {
      await server.listen({ port: env.PORT, host: env.HOST })
      logger.info(`🚀 Servidor rodando em http://${env.HOST}:${env.PORT}`)
      logger.info(`📊 Health check disponível em http://${env.HOST}:${env.PORT}/health`)

      // Configurar handlers para encerramento gracioso
      const gracefulShutdown = async (signal: string) => {
        logger.info(`📡 Recebido sinal ${signal}, iniciando encerramento gracioso...`)
        databaseMonitor.stop()
        await server.close()
        logger.info('✅ Servidor encerrado graciosamente')
        process.exit(0)
      }

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
      process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    } catch (err) {
      logger.error(
        `Erro ao iniciar servidor: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      )
      databaseMonitor.stop()
      process.exit(1)
    }
  } catch (e) {
    logger.error(
      `Erro durante inicialização: ${e instanceof Error ? e.message : 'Erro desconhecido'}`
    )
    process.exit(1)
  }
}

server()
