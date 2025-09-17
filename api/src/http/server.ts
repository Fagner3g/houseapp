import { env } from '@/config/env'
import { runMigrations, setupDatabase } from '@/db/setup'
import { registerJobs } from '@/jobs'
import { logger } from '../lib/logger'
import { buildServer } from './utils/setup'

export async function server() {
  try {
    logger.info('Iniciando API HouseApp...')

    await setupDatabase()

    // Executar migrações
    logger.info('Executando migrações...')
    await runMigrations()

    // Register crons
    // registerJobs()

    logger.info('Iniciando servidor...')
    const server = await buildServer()

    try {
      await server.listen({ port: env.PORT, host: env.HOST })
      logger.info(`Servidor rodando em http://${env.HOST}:${env.PORT}`)
    } catch (err) {
      logger.error(
        `Erro ao iniciar servidor: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      )
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
