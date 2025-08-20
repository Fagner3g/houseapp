import { env } from '@/config/env'
import { db, ping } from '@/db'
import { startCron } from '@/domain/notifications/runner'
import { logger } from './utils/logger'
import { buildServer } from './utils/setup'

async function server() {
  try {
    await ping(db)
    logger.info('database connected')
  } catch (e) {
    logger.error(e, 'ping failed')
    process.exit(1)
  }

  const server = await buildServer()

  startCron()

  try {
    await server.listen({ port: env.PORT, host: env.HOST })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

server()
