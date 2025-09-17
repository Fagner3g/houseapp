import { env } from '@/config/env'
import { runMigrations, setupDatabase } from '@/db/setup'
import { registerJobs } from '@/jobs'
import { logger } from '../lib/logger'
import { buildServer } from './utils/setup'

export async function server() {
  try {
    await setupDatabase()

    await runMigrations()

    registerJobs()

    const server = await buildServer()

    try {
      await server.listen({ port: env.PORT, host: env.HOST })
      logger.info(`Servidor rodando`)
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
